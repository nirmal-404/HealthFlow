const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/search', async (req, res) => {
  const query = req.query.q?.trim().toLowerCase();
  if (!query) {
    return res.json([]);
  }

  try {
    // Always get both exact matches and spelling suggestions
    const [rxRes, spellRes] = await Promise.all([
      axios.get(`https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`),
      axios.get(`https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(query)}`)
    ]);

    // Process exact matches
    const drugList = [];
    const groups = rxRes.data.drugGroup?.conceptGroup || [];
    groups.forEach(group => {
      if (group.conceptProperties) {
        drugList.push(...group.conceptProperties);
      }
    });

    // Get spelling suggestions
    const suggestions = spellRes.data?.suggestionGroup?.suggestionList?.suggestion || [];

    // Combine all drug names
    const allDrugNames = [
      ...drugList.map(drug => drug.name),
      ...suggestions
    ];

    // Filter for drugs starting with the query (case insensitive)
    const matches = allDrugNames.filter(name => 
      name.toLowerCase().startsWith(query)
    );

    // Format and sort results
    const uniqueResults = [...new Set(matches)]
      .sort((a, b) => {
        // Prioritize shorter names first (likely more common drugs)
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      })
      .map(name => ({ name }));

    res.json(uniqueResults.slice(0, 10));
  } catch (err) {
    console.error("RxNorm API error:", err.message);
    res.status(500).json({ error: "Failed to fetch drug suggestions" });
  }
});

module.exports = router;
