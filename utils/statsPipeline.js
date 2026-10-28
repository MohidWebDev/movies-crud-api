// "m": how many reviews a movie needs before its own average is trusted
const MIN_REVIEWS_THRESHOLD = 3;

export const buildStatsPipeline = () => [
  {
    // One group per movie, straight from the reviews collection
    $group: {
      _id: "$movie",
      averageRating: { $avg: "$rating" },
      reviewCount: { $sum: 1 },
    },
  },
  {
    // Site-wide average of the per-movie averages ("C")
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
  { $sort: { weightedRating: -1, _id: 1 } },
  { $limit: 15 },
  // Only the 15 winners get their movie details looked up
  {
    $lookup: {
      from: "movies",
      localField: "_id",
      foreignField: "_id",
      as: "movie",
    },
  },
  { $unwind: "$movie" },
  {
    $project: {
      _id: 1,
      title: "$movie.title",
      year: "$movie.year",
      poster: "$movie.poster",
      averageRating: { $round: ["$averageRating", 1] },
      reviewCount: 1,
    },
  },
];
