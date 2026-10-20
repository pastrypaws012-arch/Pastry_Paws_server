import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Review, GooglePlaceConfig } from '../models/Review.js';

dotenv.config();

const DEFAULT_PLACE_CONFIG = {
  placeName: 'Pastry Paws',
  rating: 5.0,
  reviewsCount: '5.0 ★★★★★ on Google',
  googleMapsUrl: 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6',
  placeId: 'ChIJ9a1uLoipUjoR-t29x-KVXvc',
};

const DEFAULT_REVIEWS = [
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

async function seed() {
  await connectDB();
  console.log('Seeding Google Reviews in MongoDB Atlas...');

  let config = await GooglePlaceConfig.findOne();
  if (!config) {
    config = await GooglePlaceConfig.create(DEFAULT_PLACE_CONFIG);
    console.log('Created GooglePlaceConfig for Pastry Paws');
  } else {
    config.googleMapsUrl = 'https://maps.app.goo.gl/NrA698fpTvKPwvKx6';
    config.placeName = 'Pastry Paws';
    config.rating = 5.0;
    config.reviewsCount = '5.0 ★★★★★ on Google';
    await config.save();
    console.log('Updated existing GooglePlaceConfig');
  }

  const existingCount = await Review.countDocuments();
  if (existingCount === 0) {
    await Review.insertMany(DEFAULT_REVIEWS);
    console.log(`Inserted ${DEFAULT_REVIEWS.length} initial verified 5-star Google reviews.`);
  } else {
    console.log(`Found ${existingCount} existing reviews.`);
  }

  console.log('Seeding complete!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Error seeding reviews:', err);
  process.exit(1);
});
