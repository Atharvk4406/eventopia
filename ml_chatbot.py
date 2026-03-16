import json
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Load intents file
with open("intents.json") as file:
    data = json.load(file)

patterns = []
tags = []

# Prepare training data
for intent in data["intents"]:
    for pattern in intent["patterns"]:
        patterns.append(pattern)
        tags.append(intent["tag"])

# Convert text to numbers
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(patterns)

# Train model
model = LogisticRegression()
model.fit(X, tags)


# Predict intent
def predict_intent(user_input):
    input_vector = vectorizer.transform([user_input])
    prediction = model.predict(input_vector)[0]
    return prediction


# Generate response
def get_ml_response(user_input, username):

    message = user_input.lower()

    # greeting
    if "hello" in message or "hi" in message:
        return f"Hello {username}! I am your event assistant."

    # who is using system
    if "who is using the system" in message or "who am i" in message:
        return f"You are logged in as {username}."

    # event question
    if "events" in message:
        return "I can show you available events."

    return "Ask me about events, fees or registration."