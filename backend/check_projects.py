import asyncio
from app.database import get_db
from app.models.project import Project
from sqlalchemy import select

async def check_projects():
    async for db in get_db():
        result = await db.execute(select(Project))
        projects = result.scalars().all()
        print('Database projects:')
        for p in projects:
            print(f'ID: {p.id}, Name: {p.name}')
        break

if __name__ == "__main__":
    asyncio.run(check_projects())