import mysql.connector
from flask import session, jsonify

def get_bot_response(user_message, db_config):

    try:

        message = user_message.lower()
        username = session.get("user", "Guest")

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # =========================
        # GET ALL EVENTS
        # =========================

        cursor.execute("SELECT id, name, event_date, venue, price FROM events")
        events = cursor.fetchall()


        # =========================
        # EVENT SPECIFIC QUESTIONS
        # =========================

        for event in events:

            event_name = event["name"].lower()

            if event_name in message:

                # ---------- EVENT CATEGORIES ----------
                if "category" in message or "categories" in message:

                    cursor.execute("""
                    SELECT category_name
                    FROM event_categories
                    WHERE event_id=%s
                    """, (event["id"],))

                    categories = cursor.fetchall()

                    if categories:

                        cat_list = ", ".join(
                            [c["category_name"] for c in categories]
                        )

                        return jsonify({
                            "response": f"{event['name']} has these categories: {cat_list}"
                        })

                    else:
                        return jsonify({
                            "response": f"No categories available for {event['name']}"
                        })


                # ---------- EVENT DETAILS ----------

                price_text = "Free" if event["price"] == 0 else f"₹{event['price']}"

                return jsonify({
                    "response": f"""
🎉 {event['name']}

📅 Date: {event['event_date']}
📍 Venue: {event['venue']}
💰 Fee: {price_text}
"""
                })


        # =========================
        # GREETING
        # =========================

        if "hello" in message or "hi" in message:

            return jsonify({
                "response": f"Hello {username}! I am your Eventopia assistant. Ask me about events."
            })


        # =========================
        # WHO IS USING SYSTEM
        # =========================

        if "who am i" in message or "who is using the system" in message:

            return jsonify({
                "response": f"You are logged in as {username}"
            })


        # =========================
        # LIST ALL EVENTS
        # =========================

        if "event" in message:

            names = ", ".join([e["name"] for e in events])

            return jsonify({
                "response": f"Available events are: {names}"
            })


        # =========================
        # FREE EVENTS
        # =========================

        if "free event" in message:

            cursor.execute("SELECT name FROM events WHERE price=0")
            free_events = cursor.fetchall()

            if free_events:

                names = ", ".join([e["name"] for e in free_events])

                return jsonify({
                    "response": f"Free events available: {names}"
                })

            else:

                return jsonify({
                    "response": "Currently there are no free events."
                })


        # =========================
        # REGISTRATION HELP
        # =========================

        if "register" in message:

            return jsonify({
                "response": """
To register for an event:

1️⃣ Go to Events page  
2️⃣ Select your event  
3️⃣ Click Register  
4️⃣ Fill the form  
5️⃣ Submit registration
"""
            })


        # =========================
        # DEFAULT RESPONSE
        # =========================

        return jsonify({
            "response": "Ask me about events, categories, fees, or registration."
        })


    except Exception as e:

        print("CHATBOT ERROR:", e)

        return jsonify({
            "response": "AI assistant error"
        })


    finally:

        if conn.is_connected():
            cursor.close()
            conn.close()