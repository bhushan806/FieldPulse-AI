import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "FieldPulse-AI")

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    proj_col = db["projects"]
    
    count = await proj_col.count_documents({})
    print(f"Total projects: {count}")
    
    docs = await proj_col.find({}).to_list(length=10)
    for doc in docs:
        print(doc)
        
if __name__ == "__main__":
    asyncio.run(main())
