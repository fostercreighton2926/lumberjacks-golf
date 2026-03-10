import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// OWGR-approximate rankings as of early 2026
const WORLD_RANKINGS: { name: string; ranking: number }[] = [
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
  { name: 'Byeong Hun An', ranking: 51 },
  { name: 'Taylor Pendrith', ranking: 52 },
  { name: 'Christiaan Bezuidenhout', ranking: 53 },
  { name: 'Harris English', ranking: 54 },
  { name: 'Kurt Kitayama', ranking: 55 },
  { name: 'Thomas Detry', ranking: 56 },
  { name: 'Joaquin Niemann', ranking: 57 },
  { name: 'Keith Mitchell', ranking: 58 },
  { name: 'Austin Eckroat', ranking: 59 },
  { name: 'Nick Taylor', ranking: 60 },
  { name: 'Lucas Glover', ranking: 61 },
  { name: 'Mackenzie Hughes', ranking: 62 },
  { name: 'Cam Davis', ranking: 63 },
  { name: 'Jake Knapp', ranking: 64 },
  { name: 'Alex Noren', ranking: 65 },
  { name: 'J.T. Poston', ranking: 66 },
  { name: 'Maverick McNealy', ranking: 67 },
  { name: 'Emiliano Grillo', ranking: 68 },
  { name: 'Justin Rose', ranking: 69 },
  { name: 'Beau Hossler', ranking: 70 },
  { name: 'Lee Hodges', ranking: 71 },
  { name: 'Andrew Novak', ranking: 72 },
  { name: 'Mark Hubbard', ranking: 73 },
  { name: 'Patrick Rodgers', ranking: 74 },
  { name: 'Ben Griffin', ranking: 75 },
  { name: 'Jhonattan Vegas', ranking: 76 },
  { name: 'Luke List', ranking: 77 },
  { name: 'Daniel Berger', ranking: 78 },
  { name: 'Kevin Yu', ranking: 79 },
  { name: 'Ryan Fox', ranking: 80 },
  { name: 'Rickie Fowler', ranking: 81 },
  { name: 'Matt Wallace', ranking: 82 },
  { name: 'Thorbjorn Olesen', ranking: 83 },
  { name: 'Victor Perez', ranking: 84 },
  { name: 'Phil Mickelson', ranking: 85 },
  { name: 'Rasmus Hojgaard', ranking: 86 },
  { name: 'Nico Echavarria', ranking: 87 },
  { name: 'Peter Malnati', ranking: 88 },
  { name: 'Tiger Woods', ranking: 89 },
  { name: 'Gary Woodland', ranking: 90 },
  { name: 'Bubba Watson', ranking: 91 },
  { name: 'Joel Dahmen', ranking: 92 },
  { name: 'Webb Simpson', ranking: 93 },
  { name: 'Kevin Kisner', ranking: 94 },
  { name: 'Zach Johnson', ranking: 95 },
  { name: 'Patrick Reed', ranking: 96 },
  { name: 'Sergio Garcia', ranking: 97 },
  { name: 'Francesco Molinari', ranking: 98 },
  { name: 'Henrik Stenson', ranking: 99 },
  { name: 'Louis Oosthuizen', ranking: 100 },
];

async function main() {
  console.log('Updating world rankings for all golfers...');

  // Build a name -> ranking lookup (case-insensitive)
  const rankingMap = new Map<string, number>();
  for (const entry of WORLD_RANKINGS) {
    rankingMap.set(entry.name.toLowerCase(), entry.ranking);
  }

  // Get all golfers from DB
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
      updated++;
    }
  }

  console.log(`Updated rankings for ${updated} golfers`);
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
