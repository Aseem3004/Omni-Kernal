export const demoScreenshot = {
  url: "https://www.google.com/search?q=best+hotels+in+mumbai",
  screenshotUrl:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
  source: "demo/google-search-scraper",
};

export const demoArtifacts = [
  {
    id: "demo-mumbai-hotels",
    type: "web-search-results",
    stepIndex: 0,
    step: "Research premium hotel options in Mumbai for a recruiter demo.",
    query: "best hotels in Mumbai",
    createdAt: "2026-05-02T00:00:00.000Z",
    results: [
      {
        title: "The Taj Mahal Palace, Mumbai",
        url: "https://www.tajhotels.com/en-in/hotels/taj-mahal-palace-mumbai/",
        description:
          "Iconic luxury hotel near the Gateway of India with heritage rooms, fine dining, and waterfront views.",
        position: 1,
      },
      {
        title: "The Oberoi, Mumbai",
        url: "https://www.oberoihotels.com/hotels-in-mumbai/",
        description:
          "Contemporary five-star hotel on Marine Drive with polished business amenities and Arabian Sea views.",
        position: 2,
      },
      {
        title: "Trident, Nariman Point",
        url: "https://www.tridenthotels.com/hotels-in-mumbai-nariman-point/",
        description:
          "Business-friendly luxury stay in South Mumbai with strong access to commercial districts.",
        position: 3,
      },
      {
        title: "JW Marriott Mumbai Juhu",
        url: "https://www.marriott.com/en-us/hotels/bomjw-jw-marriott-mumbai-juhu/overview/",
        description:
          "Beachfront hotel in Juhu with resort-style amenities, restaurants, and event spaces.",
        position: 4,
      },
      {
        title: "ITC Maratha, Mumbai",
        url: "https://www.itchotels.com/in/en/itcmaratha-mumbai",
        description:
          "Luxury hotel close to Mumbai airport, useful for short executive stays and conferences.",
        position: 5,
      },
    ],
    content:
      "Search query: best hotels in Mumbai\n\n1. The Taj Mahal Palace, Mumbai\n2. The Oberoi, Mumbai\n3. Trident, Nariman Point\n4. JW Marriott Mumbai Juhu\n5. ITC Maratha, Mumbai",
  },
];

export const demoLogs = [
  {
    agent: "Planner",
    status: "thinking",
    message: "Analyzing the demo request and preparing a Mumbai hotel research plan.",
  },
  {
    agent: "Planner",
    status: "completed",
    message: "Created 3 execution steps for the recruiter demo.",
  },
  {
    agent: "Executor",
    status: "thinking",
    message: "Searching for premium hotels in Mumbai.",
  },
  {
    agent: "Executor",
    status: "completed",
    message: "Found 5 relevant sources for: best hotels in Mumbai",
    artifacts: demoArtifacts,
  },
  {
    agent: "Reviewer",
    status: "thinking",
    message: "Reviewing hotel sources and preparing the final export.",
  },
  {
    agent: "Reviewer",
    status: "completed",
    message: "Demo analysis complete. Saved Mumbai_Analysis.json.",
    artifacts: demoArtifacts,
  },
];

export const demoExport = {
  displayName: "Mumbai_Analysis.json",
  goal: "Recruiter demo: hotels in Mumbai",
  review:
    "The demo research found five strong Mumbai hotel options across heritage luxury, business travel, beachfront stays, and airport convenience.",
  artifacts: demoArtifacts,
  agentLogs: demoLogs,
};
