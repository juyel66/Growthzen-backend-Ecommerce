import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// import {PrismaPrimaryClient} from "../../../prisma" 


const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });

const prismaClient = new PrismaClient({ adapter });


export default prismaClient;
