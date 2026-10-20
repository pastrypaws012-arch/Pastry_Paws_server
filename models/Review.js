import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    author_name: {
      type: String,
      required: true,
      trim: true,
    },
    profile_photo_url: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
    relative_time_description: {
      type: String,
      trim: true,
      default: 'Recently',
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    occasion: {
      type: String,
      trim: true,
      default: '',
    },
    highlight: {
      type: String,
      trim: true,
      default: '',
    },
    author_url: {
      type: String,
      trim: true,
      default: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
    },
    verified: {
      type: Boolean,
      default: true,
    },
    isDisplayed: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ['google', 'manual', 'verified_buyer'],
      default: 'google',
    },
  },
  {
    timestamps: true,
  }
);

const googlePlaceConfigSchema = new mongoose.Schema(
  {
    placeName: {
      type: String,
      default: 'Pastry Paws',
    },
    rating: {
      type: Number,
      default: 5.0,
    },
    reviewsCount: {
      type: String,
      default: '5.0 ★★★★★ on Google',
    },
    googleMapsUrl: {
      type: String,
      default: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
    },
    placeId: {
      type: String,
      default: 'ChIJ9a1uLoipUjoR-t29x-KVXvc',
    },
    googlePlacesApiKey: {
      type: String,
      default: '',
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export const GooglePlaceConfig =
  mongoose.models.GooglePlaceConfig ||
  mongoose.model('GooglePlaceConfig', googlePlaceConfigSchema);
