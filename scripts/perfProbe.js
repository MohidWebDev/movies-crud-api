import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Movie from "../models/movieModel.js";
import Review from "../models/reviewModel.js";

const MOVIE_COUNT = Number(process.env.SEED_MOVIES) || 50000;
const REVIEW_COUNT = Number(process.env.SEED_REVIEWS) || 100000;
const BATCH_SIZE = 5000;
const PAGE_SIZE = 30;
const RUNS = 3;

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Historical",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Sports",
  "Thriller",
  "War",
  "Western",
];
const ADJECTIVES = [
  "Dark",
  "Silent",
  "Golden",
  "Broken",
  "Last",
  "Hidden",
  "Crimson",
  "Eternal",
  "Lost",
  "Savage",
  "Quiet",
  "Electric",
  "Midnight",
  "Burning",
  "Frozen",
  "Wild",
];
const NOUNS = [
  "Knight",
  "River",
  "Empire",
  "Garden",
  "Storm",
  "Kingdom",
  "Shadow",
  "Horizon",
  "Machine",
  "Harvest",
  "Voyage",
  "Mirror",
  "Fortress",
  "Signal",
  "Desert",
  "Echo",
];
const DIRECTORS = [
  "Ava Mercer",
  "Liam Okafor",
  "Sofia Brandt",
  "Noah Kim",
  "Mia Rossi",
  "Ethan Cole",
  "Zara Ahmed",
  "Leo Novak",
];
const REVIEWERS = [
  "Alice",
  "Bob",
  "Carol",
  "David",
  "Erin",
  "Frank",
  "Grace",
  "Heidi",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const randomGenres = () => {
  const count = 1 + Math.floor(Math.random() * 3);
  return [...GENRES].sort(() => Math.random() - 0.5).slice(0, count);
};

// ---------- Seeding ----------

const seedMovies = async () => {
  const movieIds = [];

  for (let start = 0; start < MOVIE_COUNT; start += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, MOVIE_COUNT - start);
    const docs = Array.from({ length: size }, () => {
      const _id = new mongoose.Types.ObjectId();
      movieIds.push(_id);
      return {
        _id,
        title: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
        director: pick(DIRECTORS),
        year: 1950 + Math.floor(Math.random() * 76),
        genre: randomGenres(),
      };
    });
    await Movie.insertMany(docs);
  }

  return movieIds;
};

const seedReviews = async (movieIds) => {
  for (let start = 0; start < REVIEW_COUNT; start += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, REVIEW_COUNT - start);
    const docs = Array.from({ length: size }, () => {
      // Cubing the random number skews reviews towards the first movies,
      // so a few movies end up with thousands of reviews (like a real hit)
      const index = Math.floor(Math.pow(Math.random(), 3) * movieIds.length);
      return {
        movie: movieIds[index],
        reviewerName: pick(REVIEWERS),
        rating: 1 + Math.floor(Math.random() * 5),
      };
    });
    await Review.insertMany(docs);
  }
};

// ---------- Measuring helpers ----------

const median = (numbers) =>
  [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];

const timeIt = async (fn) => {
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  return median(times);
};

// Walks an explain plan and lists every stage name (LIMIT, FETCH, IXSCAN...)
const planStages = (node, stages = []) => {
  if (!node || typeof node !== "object") return stages;
  if (node.stage) stages.push(node.stage);
  if (node.queryPlan) planStages(node.queryPlan, stages);
  if (node.inputStage) planStages(node.inputStage, stages);
  if (node.inputStages) node.inputStages.forEach((s) => planStages(s, stages));
  return stages;
};

const describePlan = (stages) => {
  if (stages.includes("COLLSCAN")) return "COLLSCAN";
  if (stages.includes("IXSCAN")) return "IXSCAN";
  return stages.join(" > ");
};

// ---------- Queries copied from the controllers (keep in sync) ----------

// Same filter that getAllMovies builds for ?search=...
const searchFilter = (search) => {
  const regex = new RegExp(search, "i");
  return {
    $and: [
      {
        $or: [
          { title: regex },
          { director: regex },
          { genre: regex },
          {
            $expr: {
              $regexMatch: { input: { $toString: "$year" }, regex: search },
            },
          },
        ],
      },
    ],
  };
};

// Same pipeline that getMovieStats runs
const statsPipeline = () => {
  const MIN_REVIEWS_THRESHOLD = 3;
  return [
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "movie",
        as: "reviews",
      },
    },
    { $match: { "reviews.0": { $exists: true } } },
    {
      $addFields: {
        averageRating: { $avg: "$reviews.rating" },
        reviewCount: { $size: "$reviews" },
      },
    },
    {
      $setWindowFields: {
        output: { siteAverageRating: { $avg: "$averageRating" } },
      },
    },
    {
      $addFields: {
        weightedRating: {
          $add: [
            {
              $multiply: [
                {
                  $divide: [
                    "$reviewCount",
                    { $add: ["$reviewCount", MIN_REVIEWS_THRESHOLD] },
                  ],
                },
                "$averageRating",
              ],
            },
            {
              $multiply: [
                {
                  $divide: [
                    MIN_REVIEWS_THRESHOLD,
                    { $add: ["$reviewCount", MIN_REVIEWS_THRESHOLD] },
                  ],
                },
                "$siteAverageRating",
              ],
            },
          ],
        },
      },
    },
    { $sort: { weightedRating: -1 } },
    { $limit: 15 },
    {
      $project: {
        _id: 1,
        title: 1,
        year: 1,
        poster: 1,
        averageRating: { $round: ["$averageRating", 1] },
        reviewCount: 1,
      },
    },
  ];
};

// ---------- Probes ----------

const runFindProbe = async ({
  name,
  model,
  filter,
  sort,
  limit,
  withCount,
}) => {
  const buildQuery = () => {
    let query = model.find(filter);
    if (sort) query = query.sort(sort);
    return query.limit(limit);
  };

  const raw = await buildQuery().explain("executionStats");
  const explain = Array.isArray(raw) ? raw[0] : raw;
  const stages = planStages(explain.queryPlanner.winningPlan);

  // Time the whole request the way the controller does it
  const ms = await timeIt(() =>
    withCount
      ? Promise.all([buildQuery(), model.countDocuments(filter)])
      : buildQuery(),
  );

  return {
    query: name,
    plan: describePlan(stages),
    docsExamined: explain.executionStats.totalDocsExamined,
    returned: explain.executionStats.nReturned,
    requestMs: Math.round(ms),
  };
};

const runStatsProbe = async () => {
  let result = [];
  const ms = await timeIt(async () => {
    result = await Movie.aggregate(statsPipeline());
  });

  return {
    query: "Stats aggregation",
    plan: "aggregate ($lookup on every movie)",
    docsExamined: "-",
    returned: result.length,
    requestMs: Math.round(ms),
  };
};

// ---------- Main ----------

const main = async () => {
  console.log(
    "Starting in-memory MongoDB (your real database is not touched)...",
  );
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  try {
    await Movie.init();
    await Review.init();

    const movieIndexes = (await Movie.listIndexes()).map((i) => i.name);
    const reviewIndexes = (await Review.listIndexes()).map((i) => i.name);
    console.log("Movie indexes:", movieIndexes.join(", "));
    console.log("Review indexes:", reviewIndexes.join(", "));

    console.log(`Seeding ${MOVIE_COUNT} movies and ${REVIEW_COUNT} reviews...`);
    const seedStart = performance.now();
    const movieIds = await seedMovies();
    await seedReviews(movieIds);
    console.log(
      `Seeded in ${((performance.now() - seedStart) / 1000).toFixed(1)}s`,
    );

    const popularMovieId = movieIds[0];
    const popularReviewCount = await Review.countDocuments({
      movie: popularMovieId,
    });
    console.log(`Most-reviewed movie has ${popularReviewCount} reviews\n`);

    const probes = [
      {
        name: "List, no filter",
        model: Movie,
        filter: {},
        limit: PAGE_SIZE,
        withCount: true,
      },
      {
        name: "Filter genre=Comedy",
        model: Movie,
        filter: { genre: "Comedy" },
        limit: PAGE_SIZE,
        withCount: true,
      },
      {
        name: "Sort by year",
        model: Movie,
        filter: {},
        sort: { year: 1 },
        limit: PAGE_SIZE,
        withCount: true,
      },
      {
        name: 'Search "dark"',
        model: Movie,
        filter: searchFilter("dark"),
        limit: PAGE_SIZE,
        withCount: true,
      },
      {
        name: 'Search "xyzzy" (no match)',
        model: Movie,
        filter: searchFilter("xyzzy"),
        limit: PAGE_SIZE,
        withCount: true,
      },
      {
        name: "Reviews of a popular movie",
        model: Review,
        filter: { movie: popularMovieId },
        limit: 0,
        withCount: false,
      },
    ];

    const rows = [];
    for (const probe of probes) {
      rows.push(await runFindProbe(probe));
    }
    rows.push(await runStatsProbe());

    console.table(rows);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
