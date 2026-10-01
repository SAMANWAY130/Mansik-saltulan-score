import joblib
from fastapi import FastAPI
from pydantic import BaseModel, Field
import pandas as pd
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

# Load trained model
model = joblib.load("mental_health.pkl")

app = FastAPI()

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionResponse(BaseModel):
    predicted_mental_health: float

@app.get('/')
def greet():
    return "hello world"

# Pydantic input schema matching PascalCase naming convention
class StudenData(BaseModel):
    Age: int = Field(..., ge=10, le=100)
    Gender: Literal["Male", "Female"]
    Country: str
    Academic_Level: Literal['Undergraduate', 'Graduate', 'High School']
    Most_Used_Platform: Literal[
        'Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter',
        'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat'
    ]
    Purpose_Of_Use: Literal['Networking', 'Education', 'Entertainment', 'News']
    Avg_Daily_Usage_Hours: float = Field(..., ge=2, le=24)
    Daily_Unlocks: int = Field(..., ge=0)
    Study_Hours: float = Field(..., ge=0)
    Physical_Activity_Hours: float = Field(..., ge=0, le=10)
    Sleep_Hours_Per_Night: float = Field(..., ge=0, le=15)
    Stress_Level: Literal['Medium', 'Low', 'Very High', 'High']

@app.post('/predict', response_model=PredictionResponse)
def predict(data: StudenData):
    top_cou = [
        'Canada', 'USA', 'India', 'Australia', 'UK', 'Germany',
        'France', 'Mexico', 'Turkey'
    ]
    gro_con = data.Country if data.Country in top_cou else "Other"

    # Construct dataframe using the updated attribute name
    input_row = pd.DataFrame([
        {
            'Age': data.Age,
            'Gender': data.Gender,
            'Country': gro_con,
            'Academic_Level': data.Academic_Level,
            'Most_Used_Platform': data.Most_Used_Platform,
            'Purpose_Of_Use': data.Purpose_Of_Use,
            'Avg_Daily_Usage_Hours': data.Avg_Daily_Usage_Hours,
            'Daily_Unlocks': data.Daily_Unlocks,
            'Study_Hours': data.Study_Hours,
            'Physical_Activity_Hours': data.Physical_Activity_Hours,
            'Sleep_Hours_Per_Night': data.Sleep_Hours_Per_Night,
            'Stress_Level': data.Stress_Level
        }
    ])

    prediction = model.predict(input_row)[0]
    return PredictionResponse(predicted_mental_health=float(prediction))