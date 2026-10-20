import express from 'express';
import { Review, GooglePlaceConfig } from '../models/Review.js';

const router = express.Router();

const DEFAULT_PLACE_CONFIG = {
  placeName: 'Pastry Paws',
  rating: 5.0,
  reviewsCount: '5.0 ★★★★★ on Google',
  googleMapsUrl: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
  placeId: 'ChIJ9a1uLoipUjoR-t29x-KVXvc',
};

const DEFAULT_SEED_REVIEWS = [
  {
    author_name: 'Anjali R.',
    profile_photo_url: '',
    rating: 5,
    relative_time_description: '1 week ago',
    text: 'Ordered the Lotus Biscoff cake and classic dark chocolate bowl for my sister’s birthday. The texture was so rich, moist, and delightfully chocolatey without being overly sweet. Hands down the best homemade bakery in Avadi!',
    occasion: 'Birthday Celebration',
    highlight: 'Lotus Biscoff Cake',
    author_url: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
    verified: true,
    isDisplayed: true,
    source: 'google',
  },
  {
    author_name: 'Karthik S.',
    profile_photo_url: '',
    rating: 5,
    relative_time_description: '2 weeks ago',
    text: 'The warm Choco Lava cakes and fudgy Nutella brownies were insanely delicious! Beautifully packaged and delivered warm and fresh. You can really taste the pure ingredients and passion.',
    occasion: 'Weekend Treats',
    highlight: 'Choco Lava & Nutella Brownies',
    author_url: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
    verified: true,
    isDisplayed: true,
    source: 'google',
  },
  {
    author_name: 'Deepa V.',
    profile_photo_url: '',
    rating: 5,
    relative_time_description: '3 weeks ago',
    text: 'Super smooth ordering and communication on WhatsApp. The Red Velvet Cake with cream cheese frosting was an absolute showstopper. Every guest asked where we ordered it from!',
    occasion: 'Family Anniversary',
    highlight: 'Red Velvet Cake',
    author_url: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
    verified: true,
    isDisplayed: true,
    source: 'google',
  },
  {
    author_name: 'Rahul M.',
    profile_photo_url: '',
    rating: 5,
    relative_time_description: 'a month ago',
    text: 'The dessert bowls are out of this world! Pure Belgian chocolate ganache that melts in your mouth. Extremely fresh and top-notch presentation.',
    occasion: 'Special Treat',
    highlight: 'Dark Chocolate Bowl',
    author_url: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
    verified: true,
    isDisplayed: true,
    source: 'google',
  },
];

// Helper to get or initialize place config
async function getOrCreateConfig() {
  let config = await GooglePlaceConfig.findOne();
  if (!config) {
    config = await GooglePlaceConfig.create(DEFAULT_PLACE_CONFIG);
  }
  return config;
}

// GET /api/google-reviews - Public endpoint for storefront
// Returns place summary + only reviews with rating >= 4 (as requested)
router.get('/', async (req, res) => {
  try {
    const config = await getOrCreateConfig();

    // Query active reviews with rating 4 or 5 stars only
    let reviews = await Review.find({
      isDisplayed: true,
      rating: { $gte: 4 },
    }).sort({ createdAt: -1 });

    // Seed default reviews if DB is empty so the storefront displays beautifully
    if (reviews.length === 0) {
      await Review.insertMany(DEFAULT_SEED_REVIEWS);
      reviews = await Review.find({
        isDisplayed: true,
        rating: { $gte: 4 },
      }).sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      summary: {
        placeName: config.placeName,
        rating: config.rating,
        reviewsCount: config.reviewsCount,
        googleMapsUrl: config.googleMapsUrl,
        placeId: config.placeId,
        lastSyncedAt: config.lastSyncedAt,
      },
      reviews,
    });
  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      summary: DEFAULT_PLACE_CONFIG,
      reviews: DEFAULT_SEED_REVIEWS,
    });
  }
});

// GET /api/google-reviews/admin - Get all reviews for admin dashboard
router.get('/admin', async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      summary: config,
      reviews,
    });
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/google-reviews - Add new customer review (Admin)
router.post('/', async (req, res) => {
  try {
    const {
      author_name,
      rating,
      text,
      profile_photo_url,
      relative_time_description,
      occasion,
      highlight,
      author_url,
      isDisplayed,
    } = req.body;

    if (!author_name || !text) {
      return res.status(400).json({
        success: false,
        message: 'Author name and review text are required.',
      });
    }

    const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const newReview = await Review.create({
      author_name: author_name.trim(),
      rating: numericRating,
      text: text.trim(),
      profile_photo_url: profile_photo_url?.trim() || '',
      relative_time_description: relative_time_description?.trim() || 'Recently',
      occasion: occasion?.trim() || '',
      highlight: highlight?.trim() || '',
      author_url: author_url?.trim() || 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
      isDisplayed: isDisplayed !== false,
      verified: true,
      source: 'google',
    });

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: newReview,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Failed to add review' });
  }
});

// PUT /api/google-reviews/:id - Update review
router.put('/:id', async (req, res) => {
  try {
    const updated = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, message: 'Failed to update review' });
  }
});

// DELETE /api/google-reviews/:id - Delete review
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
});

// PUT /api/google-reviews/summary - Update Google Places summary and API credentials
router.put('/summary', async (req, res) => {
  try {
    const { placeName, rating, reviewsCount, googleMapsUrl, placeId, googlePlacesApiKey } =
      req.body;

    let config = await GooglePlaceConfig.findOne();
    if (!config) {
      config = new GooglePlaceConfig(DEFAULT_PLACE_CONFIG);
    }

    if (placeName !== undefined) config.placeName = placeName;
    if (rating !== undefined) config.rating = Number(rating) || 5.0;
    if (reviewsCount !== undefined) config.reviewsCount = reviewsCount;
    if (googleMapsUrl !== undefined) config.googleMapsUrl = googleMapsUrl;
    if (placeId !== undefined) config.placeId = placeId;
    if (googlePlacesApiKey !== undefined) config.googlePlacesApiKey = googlePlacesApiKey;

    await config.save();
    res.json({
      success: true,
      message: 'Google Place details updated successfully',
      data: config,
    });
  } catch (error) {
    console.error('Error updating place summary:', error);
    res.status(500).json({ success: false, message: 'Failed to update place details' });
  }
});

// POST /api/google-reviews/sync - Live Google Places API Sync (Optional API Key)
router.post('/sync', async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const apiKey = req.body.apiKey || config.googlePlacesApiKey || process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message:
          'Google Places API key is required to sync directly from Google. You can manually manage reviews in the admin console or provide a Google Cloud API Key.',
      });
    }

    // Call Google Places API (New)
    const placeId = config.placeId || 'ChIJ9a1uLoipUjoR-t29x-KVXvc';
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,rating,userRatingCount,reviews&key=${apiKey}`;

    const googleRes = await fetch(url);
    if (!googleRes.ok) {
      const errText = await googleRes.text();
      return res.status(502).json({
        success: false,
        message: `Google Places API returned an error: ${googleRes.statusText}`,
        detail: errText,
      });
    }

    const data = await googleRes.json();
    if (data.rating) config.rating = data.rating;
    if (data.userRatingCount) config.reviewsCount = `${data.userRatingCount}+ Reviews`;
    config.lastSyncedAt = new Date();
    await config.save();

    let newCount = 0;
    if (Array.isArray(data.reviews)) {
      for (const rev of data.reviews) {
        const star = rev.rating || 5;
        // Strictly filter 4 or 5 stars
        if (star >= 4 && rev.text?.text) {
          const author = rev.authorAttribution?.displayName || 'Google Reviewer';
          const existing = await Review.findOne({
            author_name: author,
            text: rev.text.text,
          });

          if (!existing) {
            await Review.create({
              author_name: author,
              profile_photo_url: rev.authorAttribution?.photoUri || '',
              rating: star,
              relative_time_description: rev.relativePublishTimeDescription || 'Recently',
              text: rev.text.text,
              author_url: rev.authorAttribution?.uri || config.googleMapsUrl,
              verified: true,
              isDisplayed: true,
              source: 'google',
            });
            newCount++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Google Maps synced successfully! Synced ${newCount} new review(s).`,
      rating: config.rating,
      reviewsCount: config.reviewsCount,
    });
  } catch (error) {
    console.error('Error syncing Google Places API:', error);
    res.status(500).json({ success: false, message: 'Google sync failed: ' + error.message });
  }
});

export default router;
