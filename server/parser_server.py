from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from recipe_scrapers import scrape_me


class LinkBody(BaseModel):
    link: str


app = FastAPI()

origins = ["http://127.0.0.1:5500", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/parse")
async def parse(body: LinkBody):
    try:
        scraper = scrape_me(body.link)
        json = scraper.to_json()
        return json
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
