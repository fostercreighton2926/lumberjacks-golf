import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RANKINGS: { name: string; ranking: number }[] = [
  { name: 'Scottie Scheffler', ranking: 1 },
  { name: 'Xander Schauffele', ranking: 2 },
  { name: 'Viktor Hovland', ranking: 3 },
  { name: 'Collin Morikawa', ranking: 4 },
  { name: 'Rory McIlroy', ranking: 5 },
  { name: 'Ludvig Åberg', ranking: 6 },
  { name: 'Jon Rahm', ranking: 7 },
  { name: 'Patrick Cantlay', ranking: 8 },
  { name: 'Wyndham Clark', ranking: 9 },
  { name: 'Max Homa', ranking: 10 },
  { name: 'Sam Burns', ranking: 11 },
  { name: 'Tommy Fleetwood', ranking: 12 },
  { name: 'Matt Fitzpatrick', ranking: 13 },
  { name: 'Tony Finau', ranking: 14 },
  { name: 'Sahith Theegala', ranking: 15 },
  { name: 'Tom Kim', ranking: 16 },
  { name: 'Sungjae Im', ranking: 17 },
  { name: 'Shane Lowry', ranking: 18 },
  { name: 'Keegan Bradley', ranking: 19 },
  { name: 'Rickie Fowler', ranking: 20 },
  { name: 'Ryan Fox', ranking: 21 },
  { name: 'Corey Conners', ranking: 22 },
  { name: 'Harris English', ranking: 23 },
  { name: 'Jason Day', ranking: 24 },
  { name: 'Russell Henley', ranking: 25 },
  { name: 'Tyrrell Hatton', ranking: 26 },
  { name: 'Taylor Pendrith', ranking: 27 },
  { name: 'Christiaan Bezuidenhout', ranking: 28 },
  { name: 'Akshay Bhatia', ranking: 29 },
  { name: 'Cam Davis', ranking: 30 },
  { name: 'Eric Cole', ranking: 31 },
  { name: 'Daniel Berger', ranking: 32 },
  { name: 'Joel Dahmen', ranking: 33 },
  { name: 'Bud Cauley', ranking: 34 },
  { name: 'Pierceson Coody', ranking: 35 },
];

async function main() {
  console.log('Seeding rankings for golfers...');

  const rankingMap = new Map<string, number>();
  for (const entry of RANKINGS) {
    rankingMap.set(entry.name.toLowerCase(), entry.ranking);
  }

  const golfers = await prisma.golfer.findMany();
  console.log(`Found ${golfers.length} golfers in database`);

  let updated = 0;
  for (const golfer of golfers) {
    const ranking = rankingMap.get(golfer.name.toLowerCase());
    if (ranking !== undefined) {
      await prisma.golfer.update({
        where: { id: golfer.id },
        data: { ranking },
      });
      console.log(`  ${golfer.name} -> #${ranking}`);
      updated++;
    }
  }

  console.log(`\nUpdated rankings for ${updated} of ${RANKINGS.length} golfers`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
