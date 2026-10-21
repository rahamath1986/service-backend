import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ServiGo database...');

  // 1. Seed demo user (matches Vinoth Kannan in Flutter UserModel)
  const passwordHash = await argon2.hash('Password123!');
  const user = await prisma.user.upsert({
    where: { phone: '+91 98765 43210' },
    update: {},
    create: {
      id: 'usr_001',
      name: 'Vinoth Kannan',
      phone: '+91 98765 43210',
      email: 'vinoth@example.com',
      passwordHash,
      address: '12, Anna Nagar, Madurai',
      role: 'CUSTOMER',
    },
  });

  // Seed user wallet
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: 1250.0,
      transactions: {
        create: [
          {
            title: 'Electrician Service',
            subtitle: 'Paid to Ramesh Kumar',
            amount: 300.0,
            date: '24 Sep 2025, 10:45 AM',
            isCredit: false,
          },
          {
            title: 'Wallet Top-up',
            subtitle: 'Added via UPI (Google Pay)',
            amount: 1000.0,
            date: '22 Sep 2025, 06:15 PM',
            isCredit: true,
          },
          {
            title: 'Plumber Service',
            subtitle: 'Paid to Suresh',
            amount: 350.0,
            date: '20 Sep 2025, 12:30 PM',
            isCredit: false,
          },
          {
            title: 'Promotional Cashback',
            subtitle: 'First booking reward',
            amount: 50.0,
            date: '15 Sep 2025, 11:30 AM',
            isCredit: true,
          },
        ],
      },
    },
  });

  // 2. Seed Services (exact list from Flutter UI)
  const servicesData = [
    {
      id: 'srv_electrician',
      name: 'Electrician',
      description: 'Electrical installation, repair, wiring, fan, light, switch board and more.',
      basePrice: 300.0,
      rating: 4.8,
      reviewsCount: 2400,
      icon: 'bolt_rounded',
      tintColor: '#FFF7ED',
      isFeatured: true,
      availableSlots: ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM'],
    },
    {
      id: 'srv_plumber',
      name: 'Plumber',
      description: 'Pipe leak repair, tap installation, water tank cleaning, bathroom fittings.',
      basePrice: 350.0,
      rating: 4.7,
      reviewsCount: 1850,
      icon: 'water_drop_rounded',
      tintColor: '#EFF6FF',
      isFeatured: true,
      availableSlots: ['9:30 AM', '11:30 AM', '2:00 PM', '4:00 PM'],
    },
    {
      id: 'srv_painter',
      name: 'Painter',
      description: 'Interior wall painting, exterior coating, waterproofing, touch-up painting.',
      basePrice: 500.0,
      rating: 4.9,
      reviewsCount: 920,
      icon: 'format_paint_rounded',
      tintColor: '#FFF1F2',
      isFeatured: true,
      availableSlots: ['8:00 AM', '10:00 AM', '1:00 PM', '4:00 PM'],
    },
    {
      id: 'srv_carpenter',
      name: 'Carpenter',
      description: 'Furniture repair, door lock installation, modular kitchen fix, wood crafts.',
      basePrice: 400.0,
      rating: 4.6,
      reviewsCount: 780,
      icon: 'handyman_rounded',
      tintColor: '#FEF3C7',
      isFeatured: true,
      availableSlots: ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'],
    },
    {
      id: 'srv_ac',
      name: 'AC Service',
      description: 'AC deep cleaning, gas refill, filter replacement, cooling issue diagnosis.',
      basePrice: 450.0,
      rating: 4.9,
      reviewsCount: 3100,
      icon: 'ac_unit_rounded',
      tintColor: '#ECFDF5',
      isFeatured: true,
      availableSlots: ['10:00 AM', '1:00 PM', '4:00 PM'],
    },
    {
      id: 'srv_driver',
      name: 'Driver',
      description: 'Professional verified on-demand drivers for personal and commercial cars.',
      basePrice: 250.0,
      rating: 4.7,
      reviewsCount: 1420,
      icon: 'drive_eta_rounded',
      tintColor: '#F5F3FF',
      isFeatured: false,
      availableSlots: ['8:00 AM', '11:00 AM', '2:00 PM', '6:00 PM'],
    },
    {
      id: 'srv_bike',
      name: 'Bike Puncture',
      description: 'Doorstep tubeless/tube puncture fix, air top-up, quick chain lubrication.',
      basePrice: 150.0,
      rating: 4.8,
      reviewsCount: 640,
      icon: 'two_wheeler_rounded',
      tintColor: '#FDF2F8',
      isFeatured: false,
      availableSlots: ['Anytime (Quick Dispatch)'],
    },
    {
      id: 'srv_car_repair',
      name: 'Car Repair',
      description: 'Battery jump-start, oil check, brake inspection, minor mechanical fixes.',
      basePrice: 550.0,
      rating: 4.8,
      reviewsCount: 890,
      icon: 'car_repair_rounded',
      tintColor: '#E0F2FE',
      isFeatured: false,
      availableSlots: ['9:00 AM', '12:00 PM', '3:00 PM'],
    },
    {
      id: 'srv_towing',
      name: 'Towing',
      description: '24/7 roadside emergency towing for two-wheelers and four-wheelers.',
      basePrice: 800.0,
      rating: 4.9,
      reviewsCount: 510,
      icon: 'local_shipping_rounded',
      tintColor: '#FEF2F2',
      isFeatured: false,
      availableSlots: ['24/7 Emergency'],
    },
    {
      id: 'srv_cleaning',
      name: 'Cleaning',
      description: 'Deep home cleaning, sofa sanitization, kitchen chimney and bathroom scrub.',
      basePrice: 600.0,
      rating: 4.9,
      reviewsCount: 2200,
      icon: 'cleaning_services_rounded',
      tintColor: '#F0FDF4',
      isFeatured: false,
      availableSlots: ['9:00 AM', '1:00 PM', '4:00 PM'],
    },
    {
      id: 'srv_appliance',
      name: 'Appliance Repair',
      description: 'Washing machine, refrigerator, microwave oven and RO water purifier service.',
      basePrice: 350.0,
      rating: 4.7,
      reviewsCount: 1680,
      icon: 'kitchen_rounded',
      tintColor: '#FFFBEB',
      isFeatured: false,
      availableSlots: ['10:00 AM', '2:00 PM', '5:00 PM'],
    },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }

  // 3. Seed Workers
  const workersData = [
    {
      id: 'wrk_ramesh',
      name: 'Ramesh Kumar',
      profession: 'Electrician',
      experienceYears: 5,
      hourlyRate: 300.0,
      distanceKm: 1.2,
      rating: 4.9,
      reviewsCount: 124,
      isVerified: true,
      about: 'Expert in home electrical work, wiring, fan, light, switch board installation etc. Reliable, punctual, and safe work standards guaranteed.',
      avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
      phone: '+91 98401 23456',
      serviceId: 'srv_electrician',
    },
    {
      id: 'wrk_suresh',
      name: 'Suresh',
      profession: 'Electrician',
      experienceYears: 4,
      hourlyRate: 280.0,
      distanceKm: 2.4,
      rating: 4.7,
      reviewsCount: 98,
      isVerified: true,
      about: 'Specialist in home circuit repairs, stabilizer setups, MCB breaker replacement, and concealed wiring.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      phone: '+91 98402 34567',
      serviceId: 'srv_electrician',
    },
    {
      id: 'wrk_arun',
      name: 'Arun Kumar',
      profession: 'Electrician',
      experienceYears: 6,
      hourlyRate: 350.0,
      distanceKm: 3.1,
      rating: 4.8,
      reviewsCount: 76,
      isVerified: true,
      about: 'Master electrician with 6+ years experience. Expert in inverter wiring, ceiling chandeliers, heavy motor switches.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      phone: '+91 98403 45678',
      serviceId: 'srv_electrician',
    },
    {
      id: 'wrk_vijay',
      name: 'Vijay',
      profession: 'Electrician',
      experienceYears: 3,
      hourlyRate: 220.0,
      distanceKm: 4.2,
      rating: 4.6,
      reviewsCount: 85,
      isVerified: false,
      about: 'Quick doorstep electrical troubleshooting, tube light fixture, socket fixes, and appliance power connections.',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
      phone: '+91 98404 56789',
      serviceId: 'srv_electrician',
    },
    {
      id: 'wrk_plumber_prakash',
      name: 'Prakash Raj',
      profession: 'Plumber',
      experienceYears: 5,
      hourlyRate: 350.0,
      distanceKm: 1.5,
      rating: 4.8,
      reviewsCount: 110,
      isVerified: true,
      about: 'Certified Master Plumber. Expert in bathroom pipe leakage, concealed plumbing, water heater fittings, and tank installations.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      phone: '+91 98405 11111',
      serviceId: 'srv_plumber',
    },
    {
      id: 'wrk_plumber_manoj',
      name: 'Manoj Kumar',
      profession: 'Plumber',
      experienceYears: 4,
      hourlyRate: 320.0,
      distanceKm: 2.8,
      rating: 4.7,
      reviewsCount: 84,
      isVerified: true,
      about: 'Reliable plumbing technician specializing in emergency leak repairs, tap replacements, and drainage unclogging.',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      phone: '+91 98405 22222',
      serviceId: 'srv_plumber',
    },
    {
      id: 'wrk_painter_selvam',
      name: 'Selvam Murugan',
      profession: 'Painter',
      experienceYears: 7,
      hourlyRate: 500.0,
      distanceKm: 2.1,
      rating: 4.9,
      reviewsCount: 95,
      isVerified: true,
      about: 'Professional interior and exterior painter with royal finish expertise, waterproof putty, and texture wall designs.',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      phone: '+91 98405 33333',
      serviceId: 'srv_painter',
    },
    {
      id: 'wrk_carpenter_david',
      name: 'David Xavier',
      profession: 'Carpenter',
      experienceYears: 6,
      hourlyRate: 400.0,
      distanceKm: 1.9,
      rating: 4.8,
      reviewsCount: 78,
      isVerified: true,
      about: 'Custom woodwork, door locks, modular kitchen adjustments, and antique furniture restoration specialist.',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      phone: '+91 98405 44444',
      serviceId: 'srv_carpenter',
    },
    {
      id: 'wrk_ac_imran',
      name: 'Imran Khan',
      profession: 'AC Service',
      experienceYears: 5,
      hourlyRate: 450.0,
      distanceKm: 1.7,
      rating: 4.9,
      reviewsCount: 145,
      isVerified: true,
      about: 'Certified HVAC & Split AC technician. Jet pump cleaning, gas charging, compressor diagnostics, and copper pipe installation.',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      phone: '+91 98405 55555',
      serviceId: 'srv_ac',
    },
    {
      id: 'wrk_cleaning_shanthi',
      name: 'Shanthi Devi',
      profession: 'Cleaning',
      experienceYears: 4,
      hourlyRate: 400.0,
      distanceKm: 2.0,
      rating: 4.9,
      reviewsCount: 160,
      isVerified: true,
      about: 'Comprehensive deep home cleaning, kitchen chimney degreasing, bathroom descaling, and sofa sanitization expert.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      phone: '+91 98405 66666',
      serviceId: 'srv_cleaning',
    },
    {
      id: 'wrk_appliance_rajesh',
      name: 'Rajesh Kannan',
      profession: 'Appliance Repair',
      experienceYears: 5,
      hourlyRate: 350.0,
      distanceKm: 2.3,
      rating: 4.7,
      reviewsCount: 92,
      isVerified: true,
      about: 'Expert repair of washing machines (front/top load), single/double door refrigerators, microwaves, and water purifiers.',
      avatarUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150',
      phone: '+91 98405 77777',
      serviceId: 'srv_appliance',
    },
    {
      id: 'wrk_driver_anbu',
      name: 'Anbu Selvan',
      profession: 'Driver',
      experienceYears: 8,
      hourlyRate: 250.0,
      distanceKm: 1.1,
      rating: 4.9,
      reviewsCount: 210,
      isVerified: true,
      about: 'Licensed commercial and personal vehicle driver with 8+ years incident-free driving history in city and highway.',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      phone: '+91 98405 88888',
      serviceId: 'srv_driver',
    },
    {
      id: 'wrk_bike_saravanan',
      name: 'Saravanan K.',
      profession: 'Bike Puncture',
      experienceYears: 4,
      hourlyRate: 150.0,
      distanceKm: 0.9,
      rating: 4.8,
      reviewsCount: 130,
      isVerified: true,
      about: 'Fast on-demand two-wheeler puncture technician. Tubeless patch repair, tube replacement, and air top-up at your location in 15 mins.',
      avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      phone: '+91 98405 99999',
      serviceId: 'srv_bike',
    },
    {
      id: 'wrk_car_ganesan',
      name: 'Ganesan P.',
      profession: 'Car Repair',
      experienceYears: 7,
      hourlyRate: 550.0,
      distanceKm: 2.5,
      rating: 4.8,
      reviewsCount: 104,
      isVerified: true,
      about: 'Mobile car mechanic equipped for battery jump-starts, brake fluid/pad replacement, coolant flushes, and emergency repairs.',
      avatarUrl: 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=150',
      phone: '+91 98405 12345',
      serviceId: 'srv_car_repair',
    },
    {
      id: 'wrk_towing_muthu',
      name: 'Muthu Pandi',
      profession: 'Towing',
      experienceYears: 6,
      hourlyRate: 800.0,
      distanceKm: 3.0,
      rating: 4.9,
      reviewsCount: 65,
      isVerified: true,
      about: '24/7 flatbed hydraulic towing service for safe, zero-damage transport of motorcycles, hatchbacks, and sedans.',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      phone: '+91 98405 54321',
      serviceId: 'srv_towing',
    },
  ];

  for (const w of workersData) {
    await prisma.worker.upsert({
      where: { id: w.id },
      update: w,
      create: w,
    });
  }

  // 4. Seed Reviews for Ramesh
  const reviewsData = [
    {
      id: 'rev_1',
      userId: user.id,
      workerId: 'wrk_ramesh',
      userName: 'Priya M.',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      rating: 5.0,
      date: '20 Sep 2025',
      comment: 'Very punctual and solved the short circuit issue within 20 mins! Highly recommended.',
    },
    {
      id: 'rev_2',
      userId: user.id,
      workerId: 'wrk_ramesh',
      userName: 'Karthik R.',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      rating: 5.0,
      date: '18 Sep 2025',
      comment: 'Neat work, clean cleanup after job, reasonable price. Extremely professional.',
    },
  ];

  for (const r of reviewsData) {
    await prisma.review.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }

  // 5. Seed Initial Booking & Chat Room
  const booking = await prisma.booking.upsert({
    where: { id: 'SG202509241234' },
    update: {},
    create: {
      id: 'SG202509241234',
      userId: user.id,
      workerId: 'wrk_ramesh',
      serviceName: 'Electrician',
      date: '24 Sep 2025',
      time: '10:00 AM',
      address: 'Home - 12, Anna Nagar, Madurai',
      note: 'Gate code #402, extra details',
      amount: 300.0,
      status: 'UPCOMING',
      paymentMethod: 'UPI (Google Pay)',
      isPaid: false,
    },
  });

  const chatRoom = await prisma.chatRoom.upsert({
    where: { bookingId: booking.id },
    update: {},
    create: {
      id: 'room_SG202509241234',
      bookingId: booking.id,
    },
  });

  const messages = [
    {
      id: 'msg_1',
      roomId: chatRoom.id,
      senderId: user.id,
      text: "Hi, I'm on my way.",
      time: '10:10 AM',
      isMe: false,
    },
    {
      id: 'msg_2',
      roomId: chatRoom.id,
      senderId: user.id,
      text: 'Okay, please come through the main gate.',
      time: '10:12 AM',
      isMe: true,
    },
  ];

  for (const m of messages) {
    await prisma.chatMessage.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
