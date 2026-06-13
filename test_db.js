const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.siteAnalytics.findFirst().then(console.log).catch(console.error);
