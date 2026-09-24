const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const Role = require("../models/Role");

const googleClientId = process.env.GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "your-google-client-secret";
const baseUrl = process.env.BASE_URL || "http://localhost:5000";

console.log(googleClientId)
// Only configure Google Strategy if placeholders or valid credentials present
passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: `${baseUrl}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log("[Passport GoogleStrategy] Profile received for email:", profile?.emails?.[0]?.value);

        const email = profile?.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;
        const name = profile.displayName || profile.name?.givenName || email?.split("@")[0];
        const picture = profile.photos?.[0]?.value || "";

        if (!email) {
          return done(new Error("No email found in Google profile"), null);
        }

        // Search for existing user by googleId or email
        let user = await User.findOne({
          $or: [{ oauthProviderId: googleId }, { email: email }],
        });

        if (user) {
          console.log("[Passport GoogleStrategy] Existing user found:", user._id);
          if (user.status === "suspended" || user.status === "inactive") {
            return done(null, false, { message: `Account is ${user.status}` });
          }

          if (!user.oauthProviderId) {
            user.oauthProviderId = googleId;
          }
          user.authType = "google";
          user.lastLoginAt = new Date();
          user.loginCount = (user.loginCount || 0) + 1;
          await user.save();
        } else {
          console.log("[Passport GoogleStrategy] Registering new user via Google OAuth:", email);

          // Get default patient role or create on-the-fly
          let patientRole = await Role.findOne({ name: "sys_patient" });
          if (!patientRole) {
            patientRole = await Role.findOne({ name: "patient" });
          }
          if (!patientRole) {
            console.log("[Passport GoogleStrategy] sys_patient role not found in DB, creating system role automatically...");
            patientRole = new Role({
              name: "sys_patient",
              permissions: [
                { entity: "user", action: "view", scope: "own" },
                { entity: "user", action: "delete", scope: "own" },
                { entity: "user", action: "update", scope: "own" },
                { entity: "record", action: "view", scope: "own" },
                { entity: "record", action: "view", scope: "linked" },
                { entity: "encounter", action: "view", scope: "linked" },
                { entity: "prescription", action: "view", scope: "linked" },
                { entity: "appointment", action: "create", scope: "own" },
                { entity: "appointment", action: "view", scope: "own" },
                { entity: "document", action: "upload", scope: "own" },
                { entity: "document", action: "view", scope: "own" },
                { entity: "feedback", action: "create", scope: "own" },
                { entity: "feedback", action: "view", scope: "own" },
              ],
              isSystem: true,
            });
            await patientRole.save();
          }

          user = new User({
            name: name,
            email: email,
            mobile: "N/A (Google OAuth)",
            authType: "google",
            oauthProviderId: googleId,
            roles: [{ role: patientRole._id }],
            lastActiveRole: patientRole._id,
            status: "active",
            otpEnabled: false,
            lastLoginAt: new Date(),
            loginCount: 1,
          });

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("[Passport GoogleStrategy] Error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
