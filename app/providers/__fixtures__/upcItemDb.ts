// Trimmed copies of real UPCitemdb trial-API responses (recorded 2026-10-16).
// Offer links are left out: they're affiliate redirects the app never uses.

export const tamiyaSpitfireLookup = {
  code: "OK",
  total: 1,
  offset: 0,
  items: [
    {
      ean: "4950344611195",
      title: "Tamiya America, Inc 1/48 Supermarine Spitfire Mk.I, TAM61119",
      // Real response: the "description" is just the title again.
      description: "Tamiya America, Inc 1/48 Supermarine Spitfire Mk.I, TAM61119",
      upc: "4950344611195",
      brand: "Tamiya",
      model: "TAM61119",
      color: "",
      size: "",
      dimension: "",
      weight: "",
      category: "Toys & Games > Toys > Play Vehicles > Toy Airplanes",
      currency: "",
      lowest_recorded_price: 9.99,
      highest_recorded_price: 107.56,
      images: [
        "https://i5.walmartimages.com/asr/f1d5fb58-c0d6-44e0-a23c-5f9995c83a62.a3883ff9e9a22b175c6041279c804ebd.jpeg?odnHeight=450&odnWidth=450&odnBg=ffffff",
        "https://i11.onbuy.com/product/514d562a7a404888897757fc5df655f0-l16823467.jpg",
      ],
      offers: [
        {
          merchant: "Wal-Mart.com",
          domain: "walmart.com",
          title: "Tamiya America, Inc 1/48 Supermarine Spitfire Mk.I, TAM61119",
          currency: "",
          list_price: "",
          price: 32.4,
          shipping: "Free Shipping",
          condition: "New",
          availability: "",
          updated_t: 1712345678,
        },
        {
          merchant: "OnBuy.com",
          domain: "onbuy.com",
          title: "Tamiya 61119 - 1:48 British Supermarine Spitfire Mk.I",
          currency: "GBP",
          list_price: "",
          price: 24.99,
          shipping: "",
          condition: "New",
          availability: "",
          updated_t: 1712345000,
        },
      ],
      elid: "1234567890",
    },
  ],
};

export const revellTugLookup = {
  code: "OK",
  total: 1,
  offset: 0,
  items: [
    {
      ean: "4009803052397",
      title: "Revell 05239 Tug Boat Smit Houston 1:200 Ship Model Kit",
      description: "",
      upc: "4009803052397",
      brand: "Revell",
      model: "",
      color: "",
      size: "",
      dimension: "",
      weight: "",
      category: "Toys & Games > Toys > Play Vehicles",
      currency: "",
      lowest_recorded_price: 0,
      highest_recorded_price: 0,
      images: [],
      offers: [],
    },
  ],
};

export const noMatchLookup = { code: "OK", total: 0, offset: 0, items: [] };

// "tamiya 61119" — the same kit listed by several resellers under their own
// UPCs, plus one unrelated Tamiya kit that should stay a separate group.
export const tamiyaSearch = {
  code: "OK",
  total: 4,
  offset: 0,
  items: [
    tamiyaSpitfireLookup.items[0],
    {
      ean: "0098979611194",
      upc: "098979611194",
      title: "Tamiya 1/48 Spitfire Mk.I Plastic Model Kit TAM61119",
      brand: "Tamiya",
      model: "61119",
      images: ["https://i5.walmartimages.com/asr/other-spitfire.jpeg"],
      lowest_recorded_price: 21.5,
      highest_recorded_price: 140,
      offers: [],
    },
    {
      ean: "0670133611192",
      upc: "670133611192",
      title: "Tamiya America, Inc 61119 1/48 Spitfire Mk.I",
      brand: "Tamiya America, Inc",
      model: "",
      images: [],
      offers: [],
    },
    {
      ean: "4950344610327",
      upc: "4950344610327",
      title: "Tamiya 1/48 Supermarine Spitfire Mk.Vb, TAM61033",
      brand: "Tamiya",
      model: "TAM61033",
      images: ["https://images.onbuy.com/spitfire-61033.jpg"],
      offers: [],
    },
  ],
};

// `model` holds a marketplace ID, not the kit number — the kit number (58638)
// is only in the titles. Also a 1:10 RC car rather than a static kit.
export const tamiyaRcCarLookup = {
  code: "OK",
  total: 1,
  offset: 0,
  items: [
    {
      ean: "4950344586387",
      title: "Tamiya 58638 1:10 RC Mercedes-Benz 190E 2.5-16 - TT01E Evo.II Team Zakspeed",
      brand: "Tamiya",
      model: "ADIB01LXLUUAO",
      images: [],
      offers: [
        { title: "Tamiya 58638 1:10 RC Mercedes-Benz 190E 2.5-16 - TT01E Evo.II Team Zakspeed" },
        { title: "tamiya 1/10 mercedes 190 e 2.5 16 evo ii diebels alt tt01e kit" },
      ],
    },
  ],
};
