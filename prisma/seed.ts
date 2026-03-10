import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TOP_50_GOLFERS = [
  { name: 'Scottie Scheffler', ranking: 1 },
  { name: 'Xander Schauffele', ranking: 2 },
  { name: 'Rory McIlroy', ranking: 3 },
  { name: 'Collin Morikawa', ranking: 4 },
  { name: 'Ludvig Åberg', ranking: 5 },
  { name: 'Wyndham Clark', ranking: 6 },
  { name: 'Viktor Hovland', ranking: 7 },
  { name: 'Patrick Cantlay', ranking: 8 },
  { name: 'Hideki Matsuyama', ranking: 9 },
  { name: 'Tommy Fleetwood', ranking: 10 },
  { name: 'Jon Rahm', ranking: 11 },
  { name: 'Shane Lowry', ranking: 12 },
  { name: 'Sahith Theegala', ranking: 13 },
  { name: 'Bryson DeChambeau', ranking: 14 },
  { name: 'Sungjae Im', ranking: 15 },
  { name: 'Brooks Koepka', ranking: 16 },
  { name: 'Tony Finau', ranking: 17 },
  { name: 'Russell Henley', ranking: 18 },
  { name: 'Matt Fitzpatrick', ranking: 19 },
  { name: 'Robert MacIntyre', ranking: 20 },
  { name: 'Keegan Bradley', ranking: 21 },
  { name: 'Justin Thomas', ranking: 22 },
  { name: 'Sam Burns', ranking: 23 },
  { name: 'Cameron Young', ranking: 24 },
  { name: 'Akshay Bhatia', ranking: 25 },
  { name: 'Min Woo Lee', ranking: 26 },
  { name: 'Corey Conners', ranking: 27 },
  { name: 'Jason Day', ranking: 28 },
  { name: 'Denny McCarthy', ranking: 29 },
  { name: 'Brian Harman', ranking: 30 },
  { name: 'Tom Kim', ranking: 31 },
  { name: 'Will Zalatoris', ranking: 32 },
  { name: 'Sepp Straka', ranking: 33 },
  { name: 'Chris Kirk', ranking: 34 },
  { name: 'Billy Horschel', ranking: 35 },
  { name: 'Adam Scott', ranking: 36 },
  { name: 'Cameron Smith', ranking: 37 },
  { name: 'Jordan Spieth', ranking: 38 },
  { name: 'Max Homa', ranking: 39 },
  { name: 'Taylor Moore', ranking: 40 },
  { name: 'Dustin Johnson', ranking: 41 },
  { name: 'Si Woo Kim', ranking: 42 },
  { name: 'Tyrrell Hatton', ranking: 43 },
  { name: 'Davis Thompson', ranking: 44 },
  { name: 'Tom Hoge', ranking: 45 },
  { name: 'Stephan Jaeger', ranking: 46 },
  { name: 'Aaron Rai', ranking: 47 },
  { name: 'Eric Cole', ranking: 48 },
  { name: 'Nick Dunlap', ranking: 49 },
  { name: 'Matthieu Pavon', ranking: 50 },
];

const SIGNATURE_EVENTS_2025 = [
  {
    name: 'AT&T Pebble Beach Pro-Am',
    course: 'Pebble Beach Golf Links',
    location: 'Pebble Beach, CA',
    startDate: '2025-01-30',
    endDate: '2025-02-02',
  },
  {
    name: 'The Genesis Invitational',
    course: 'Riviera Country Club',
    location: 'Pacific Palisades, CA',
    startDate: '2025-02-13',
    endDate: '2025-02-16',
  },
  {
    name: 'Arnold Palmer Invitational',
    course: 'Bay Hill Club & Lodge',
    location: 'Orlando, FL',
    startDate: '2025-03-06',
    endDate: '2025-03-09',
  },
  {
    name: 'THE PLAYERS Championship',
    course: 'TPC Sawgrass',
    location: 'Ponte Vedra Beach, FL',
    startDate: '2025-03-13',
    endDate: '2025-03-16',
  },
  {
    name: 'Dell Technologies Match Play',
    course: 'Austin Country Club',
    location: 'Austin, TX',
    startDate: '2025-03-26',
    endDate: '2025-03-30',
  },
  {
    name: 'RBC Heritage',
    course: 'Harbour Town Golf Links',
    location: 'Hilton Head Island, SC',
    startDate: '2025-04-17',
    endDate: '2025-04-20',
  },
  {
    name: 'Wells Fargo Championship',
    course: 'Quail Hollow Club',
    location: 'Charlotte, NC',
    startDate: '2025-05-08',
    endDate: '2025-05-11',
  },
  {
    name: 'The Memorial Tournament',
    course: 'Muirfield Village Golf Club',
    location: 'Dublin, OH',
    startDate: '2025-06-05',
    endDate: '2025-06-08',
  },
  {
    name: 'Travelers Championship',
    course: 'TPC River Highlands',
    location: 'Cromwell, CT',
    startDate: '2025-06-19',
    endDate: '2025-06-22',
  },
  {
    name: 'Genesis Scottish Open',
    course: 'The Renaissance Club',
    location: 'North Berwick, Scotland',
    startDate: '2025-07-10',
    endDate: '2025-07-13',
  },
  {
    name: 'The Sentry',
    course: 'Kapalua Plantation Course',
    location: 'Maui, HI',
    startDate: '2025-01-02',
    endDate: '2025-01-05',
  },
];

async function main() {
  console.log('🌲 Seeding Lumberjacks Fantasy Golf database...');

  // Create 2025 season
  const season = await prisma.season.upsert({
    where: { id: 'season-2025' },
    update: { isActive: true },
    create: {
      id: 'season-2025',
      name: '2025 PGA Tour Season',
      year: 2025,
      isActive: true,
    },
  });
  console.log(`✅ Season: ${season.name}`);

  // Seed golfers
  for (const golfer of TOP_50_GOLFERS) {
    await prisma.golfer.upsert({
      where: { id: `golfer-${golfer.ranking}` },
      update: { name: golfer.name, ranking: golfer.ranking },
      create: {
        id: `golfer-${golfer.ranking}`,
        name: golfer.name,
        ranking: golfer.ranking,
      },
    });
  }
  console.log(`✅ Seeded ${TOP_50_GOLFERS.length} golfers`);

  // Seed signature events
  for (const event of SIGNATURE_EVENTS_2025) {
    const startDate = new Date(event.startDate);
    const pickDeadline = new Date(event.startDate);
    pickDeadline.setHours(7, 0, 0, 0); // 7 AM ET on Thursday

    await prisma.tournament.upsert({
      where: { id: `tournament-${event.startDate}` },
      update: {
        name: event.name,
        course: event.course,
        location: event.location,
        startDate,
        endDate: new Date(event.endDate),
        pickDeadline,
      },
      create: {
        id: `tournament-${event.startDate}`,
        seasonId: season.id,
        name: event.name,
        course: event.course,
        location: event.location,
        startDate,
        endDate: new Date(event.endDate),
        pickDeadline,
      },
    });
  }
  console.log(`✅ Seeded ${SIGNATURE_EVENTS_2025.length} signature events`);

  console.log('🏌️ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
