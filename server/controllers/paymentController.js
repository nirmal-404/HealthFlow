const crypto = require("crypto");
const dotenv = require("dotenv");
const Appointment = require("../models/Appointment");
const DoctorSchedule = require("../models/DoctorSchedule");
const User = require("../models/User");
const { sendAppointmentConfirmation } = require("../utils/emailService");
const { RtcTokenBuilder, RtcRole } = require("agora-token");
const { cacheUtil } = require("../utils/cacheUtil");

dotenv.config();

const generatePaymentHash = (orderId, amount, currency, merchantSecret) => {
  console.log("Generating payment hash for:", { orderId, amount, currency });
  const amountFormatted = parseFloat(amount)
    .toLocaleString("en-us", { minimumFractionDigits: 2 })
    .replaceAll(",", "");
  console.log("Formatted amount:", amountFormatted);
  const hashedSecret = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();
  console.log("Hashed merchant secret:", hashedSecret);
  const stringToHash =
    process.env.PAYHERE_MERCHANT_ID +
    orderId +
    amountFormatted +
    currency +
    hashedSecret;
  console.log("String to hash:", stringToHash);
  const hash = crypto
    .createHash("md5")
    .update(stringToHash)
    .digest("hex")
    .toUpperCase();
  console.log("Generated hash:", hash);
  return hash;
};

const validatePaymentNotification = (
  merchantId,
  orderId,
  payhere_amount,
  payhere_currency,
  status_code,
  merchantSecret,
  md5sig
) => {
  console.log("Validating payment notification:", {
    merchantId,
    orderId,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  });
  const hashedSecret = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();
  console.log("Hashed merchant secret for validation:", hashedSecret);
  const stringToHash =
    merchantId +
    orderId +
    payhere_amount +
    payhere_currency +
    status_code +
    hashedSecret;
  console.log("Validation string to hash:", stringToHash);
  const calculatedHash = crypto
    .createHash("md5")
    .update(stringToHash)
    .digest("hex")
    .toUpperCase();
  console.log("Calculated hash:", calculatedHash);
  console.log("Received hash:", md5sig);
  console.log("Hashes match:", calculatedHash === md5sig);
  return calculatedHash === md5sig;
};

exports.initiatePayment = async (req, res) => {
  try {
    console.log("\n=== PAYMENT INITIATION ===");
    console.log(
      "Payment initiation request received:",
      JSON.stringify(req.body, null, 2)
    );
    const { appointment, returnUrl, cancelUrl } = req.body;

    // Log environment check
    console.log("\nEnvironment Check:");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("BASE_URL:", process.env.BASE_URL);
    console.log("MERCHANT_ID exists:", !!process.env.PAYHERE_MERCHANT_ID);
    console.log(
      "MERCHANT_SECRET exists:",
      !!process.env.PAYHERE_MERCHANT_SECRET
    );

    if (
      !process.env.PAYHERE_MERCHANT_ID ||
      !process.env.PAYHERE_MERCHANT_SECRET
    ) {
      throw new Error("Payment gateway configuration error");
    }

    const orderId = `APT${Date.now()}`;
    console.log("\nGenerated order ID:", orderId);

    // Cache appointment details
    const appointmentDetails = {
      ...appointment,
      orderId,
      status: "active", // Set default status as active
    };
    await cacheUtil.cacheAppointmentDetails(orderId, appointmentDetails);
    console.log("Cached appointment details for order:", orderId);

    const hash = generatePaymentHash(
      orderId,
      appointment.consultationFee,
      "LKR",
      process.env.PAYHERE_MERCHANT_SECRET
    );

    const paymentData = {
      merchant_id: process.env.PAYHERE_MERCHANT_ID,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: `${process.env.BASE_URL}/api/payments/notify`,
      first_name: appointment.firstName,
      last_name: appointment.lastName,
      email: appointment.email,
      phone: appointment.phone,
      address: "Not Required",
      city: "Not Required",
      country: "Sri Lanka",
      order_id: orderId,
      items: `Appointment with Dr. ${appointment.doctorName}`,
      currency: "LKR",
      amount: appointment.consultationFee,
      hash: hash,
    };

    console.log("\nPayment Data Prepared:");
    console.log("notify_url:", paymentData.notify_url);
    console.log("order_id:", paymentData.order_id);
    console.log("amount:", paymentData.amount);
    console.log("hash:", paymentData.hash);

    const checkoutUrl =
      process.env.NODE_ENV === "production"
        ? "https://www.payhere.lk/pay/checkout"
        : "https://sandbox.payhere.lk/pay/checkout";

    console.log("\nRedirecting to:", checkoutUrl);
    res.status(200).json({ paymentData, checkoutUrl });
  } catch (error) {
    console.error("\nPayment Initiation Error:", error);
    console.error("Stack:", error.stack);
    res
      .status(500)
      .json({ message: "Error initiating payment", error: error.message });
  }
};

exports.handlePaymentSuccess = async (req, res) => {
  let session;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  while (retryCount < MAX_RETRIES) {
    try {
      // Start new session for each retry
      if (session) {
        await session.endSession();
      }
      session = await Appointment.startSession();
      session.startTransaction();

      console.log("\n=== PAYMENT SUCCESS HANDLER ===");
      console.log("Attempt:", retryCount + 1);
      const { orderId } = req.body;
      console.log("Processing success for order:", orderId);

      if (!orderId) {
        console.error("No order ID provided");
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "No order ID provided",
        });
      }

      if (!orderId.startsWith("APT")) {
        console.error("Invalid order ID format:", orderId);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid order ID format",
        });
      }

      // First check if appointment already exists to handle concurrent requests
      const existingAppointment = await Appointment.findOne({
        orderId,
      }).session(session);
      if (existingAppointment) {
        console.log("Appointment already exists:", existingAppointment._id);
        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({
          success: true,
          message: "Appointment already created",
          appointmentId: existingAppointment._id,
        });
      }

      // Get appointment details from cache
      const appointmentDetails = await cacheUtil.getAppointmentDetails(orderId);
      if (!appointmentDetails) {
        console.error(
          "Appointment details not found in cache for order:",
          orderId
        );
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message:
            "Appointment details not found. The payment session may have expired.",
        });
      }

      console.log("\n=== CREATING APPOINTMENT ===");
      console.log("Retrieved appointment details:", appointmentDetails);

      // Find the doctor's schedule and slot with session
      const schedules = await DoctorSchedule.find({
        doctorId: appointmentDetails.doctorId,
      }).session(session);
      console.log("Found schedules:", schedules.length);

      if (!schedules.length) {
        await session.abortTransaction();
        session.endSession();
        throw new Error("Doctor schedule not found");
      }

      let slot;
      let schedule;

      for (const sched of schedules) {
        slot = sched.slots.id(appointmentDetails.slotId);
        if (slot) {
          schedule = sched;
          console.log("Found matching slot:", slot);
          break;
        }
      }

      if (!slot) {
        await session.abortTransaction();
        session.endSession();
        throw new Error("Selected time slot not found");
      }

      if (slot.isBooked) {
        await session.abortTransaction();
        session.endSession();
        throw new Error("Selected time slot is already booked");
      }

      // Generate Agora token
      const channelName = `appointment-${appointmentDetails.slotId}`;
      const uid = 0;
      const role = RtcRole.PUBLISHER;
      const expirationTimeInSeconds = 3600 * 24 * 30;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const agoraToken = RtcTokenBuilder.buildTokenWithUid(
        process.env.APP_ID,
        process.env.APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpiredTs
      );

      // Create appointment within transaction
      const appointment = new Appointment({
        ...appointmentDetails,
        time: new Date(slot.slotTime),
        channelName,
        agoraToken,
        status: "active",
      });

      // Save appointment within transaction
      const savedAppointment = await appointment.save({ session });
      console.log("Appointment created successfully:", savedAppointment._id);

      // Mark slot as booked within same transaction
      slot.isBooked = true;
      await schedule.save({ session });
      console.log("Slot marked as booked");

      // Commit transaction
      await session.commitTransaction();
      console.log("Transaction committed successfully");
      session.endSession();

      // After successful transaction, send confirmation email
      try {
        await sendAppointmentConfirmation({
          email: appointmentDetails.email,
          firstName: appointmentDetails.firstName,
          lastName: appointmentDetails.lastName,
          time: slot.slotTime,
          doctorName: appointmentDetails.doctorName,
          reason: appointmentDetails.reason,
        });
        console.log("Confirmation email sent");
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
        // Don't fail the request if email fails
      }

      // Remove appointment details from cache after successful creation
      await cacheUtil.removeAppointmentDetails(orderId);
      console.log("Removed appointment details from cache");

      return res.status(200).json({
        success: true,
        message: "Appointment created successfully",
        appointmentId: savedAppointment._id,
      });
    } catch (error) {
      console.error("\nPayment Success Handler Error:", error);
      console.error("Stack:", error.stack);

      // If session exists, abort transaction
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      // Check if error is a transient transaction error that we should retry
      if (
        error.errorLabels?.includes("TransientTransactionError") &&
        retryCount < MAX_RETRIES - 1
      ) {
        console.log(`Retrying transaction... (attempt ${retryCount + 1})`);
        retryCount++;
        // Add exponential backoff delay
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 100)
        );
        continue;
      }

      // If we've exhausted retries or it's not a retryable error, return error response
      return res.status(500).json({
        success: false,
        message: error.message || "Error processing payment success",
        error: error.message,
        isTransient:
          error.errorLabels?.includes("TransientTransactionError") || false,
      });
    }
  }
};

exports.handlePaymentNotification = async (req, res) => {
  let session;
  try {
    console.log("\n=== PAYMENT NOTIFICATION RECEIVED ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const merchant_id = req.body.merchant_id;
    const order_id = req.body.order_id;
    const payhere_amount = req.body.payhere_amount;
    const payhere_currency = req.body.payhere_currency;
    const status_code = req.body.status_code;
    const md5sig = req.body.md5sig;

    // Validate payment notification
    const isValid = validatePaymentNotification(
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      process.env.PAYHERE_MERCHANT_SECRET,
      md5sig
    );

    if (!isValid) {
      console.error("Payment validation failed!");
      return res.status(400).json({ message: "Invalid payment notification" });
    }

    // For successful payments, double-check if appointment was created
    if (status_code === "2") {
      session = await Appointment.startSession();
      session.startTransaction();

      // Check for existing appointment within transaction
      const existingAppointment = await Appointment.findOne({
        orderId: order_id,
      }).session(session);

      if (!existingAppointment) {
        const appointmentDetails = await cacheUtil.getAppointmentDetails(
          order_id
        );
        if (appointmentDetails) {
          console.log("Appointment not found, creating from notification...");
          // Create appointment using handlePaymentSuccess logic but within this transaction
          await this.handlePaymentSuccess(
            { body: { orderId: order_id } },
            { status: () => ({ json: () => {} }) },
            session
          );
        }
      }

      await session.commitTransaction();
      session.endSession();
    }

    res.status(200).json({ message: "Payment notification processed" });
  } catch (error) {
    console.error("\nPayment Notification Error:", error);
    console.error("Stack:", error.stack);

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    res
      .status(500)
      .json({
        message: "Error handling payment notification",
        error: error.message,
      });
  }
};
