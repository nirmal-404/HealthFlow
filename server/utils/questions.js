const questions = [
    {
      _id: "q1",
      text: "How many days did it take for you to feel noticeable improvement?",
      type: "number",
      options: ["0-30"],
      hasDetails: false,
    },
    {
      _id: "q2",
      text: "Did you experience good sleep during the recovery period?",
      type: "radio",
      options: ["Yes", "No"],
      hasDetails: false,
    },
    {
      _id: "q3",
      text: "Did you follow all the prescribed medications and treatments?",
      type: "radio",
      options: ["Yes", "No"],
      hasDetails: false,
    },
    {
      _id: "q4",
      text: "How consistent were you in taking your prescribed medication?",
      type: "radio",
      options: ["Very Consistent", "Somewhat Consistent", "Not Consistent"],
      hasDetails: false,
    },
    {
      _id: "q5",
      text: "Did you notice any improvement in your symptoms after starting the medication?",
      type: "radio",
      options: ["Yes", "No"],
      hasDetails: false,
    },
    {
      _id: "q6",
      text: "Did you feel any unexpected pain or discomfort during the recovery process?",
      type: "radio",
      options: ["Yes", "No"],
      hasDetails: true,
    },
    {
      _id: "q7",
      text: "Did you experience any side effects from the medication? (If yes, please specify)",
      type: "radio",
      options: ["Yes", "No"],
      hasDetails: true,
    },
    {
      _id: "q8",
      text: "How often did your symptoms reappear after the consultation?",
      type: "radio",
      options: ["Frequently", "Occasionally", "Never"],
      hasDetails: false,
    },
    {
      _id: "q9",
      text: "Were you able to return to your daily activities as expected?",
      type: "radio",
      options: ["Yes", "No"],
      hasDetails: false,
    },
    {
      _id: "q10",
      text: "How would you rate your overall health improvement after the consultation?",
      type: "number",
      options: ["0-5"],
      hasDetails: false,
    },
  ];
  
  module.exports = questions;