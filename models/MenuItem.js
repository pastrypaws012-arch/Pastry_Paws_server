import mongoose from 'mongoose';

const pricingTierSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const addonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    priceDisplay: {
      type: String,
      trim: true,
    },
    startingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: 'https://res.cloudinary.com/ku59ko3p/image/upload/v1792430625/PastryPaws/hero-cake.jpg',
      trim: true,
    },
    googleDriveFileId: {
      type: String,
      default: '',
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    badge: {
      type: String,
      default: '',
      trim: true,
    },
    pricingDetails: {
      type: [pricingTierSchema],
      default: [],
    },
    addons: {
      type: [addonSchema],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
