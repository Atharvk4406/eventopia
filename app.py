from flask import Flask, render_template, request, redirect, session, url_for
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from chatbot import get_bot_response
from flask import jsonify
from ml_chatbot import get_ml_response
import os
from werkzeug.utils import secure_filename
from email.mime.text import MIMEText
import smtplib
import pandas as pd
from flask import send_file



app = Flask(__name__)
app.secret_key = "your_secret_key_here"
UPLOAD_FOLDER = "static/uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# ==========================
# MySQL Configuration
# ==========================
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "Atharv",   # your root password
    "database": "eventhopia"
}
def get_db_coonection():
        return mysql.connector.connect(**db_config)

# ==========================
# START PAGE (Default)
# ==========================
@app.route("/")
def start():
    # Website starts from login page
    return redirect(url_for("login"))


# ==========================
# HOME / DASHBOARD
# ==========================
@app.route("/home")
def home():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("index.html",username=session['user'])

# ==========================
# LOGIN
# ==========================
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, password FROM users WHERE username=%s", (username,))
        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user[2], password):
            session["user"] = user[1]
            return redirect(url_for("home"))
        else:
            return render_template("login.html", error="Invalid username or password")

    return render_template("login.html")


# ==========================
# REGISTER
# ==========================
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        password = generate_password_hash(request.form["password"])

        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, password) VALUES (%s, %s)",
                (username, password)
            )
            conn.commit()
            conn.close()
            return redirect(url_for("login"))

        except mysql.connector.IntegrityError:
            return render_template("register.html", error="Username already exists")

    return render_template("register.html")


# ==========================
# LOGOUT
# ==========================
@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))
@app.route("/ask_ai", methods=["POST"])
def ask_ai():

    try:
        data = request.get_json()
        user_message = data.get("message","").lower()

        username = session.get("user","Guest")

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # GET EVENTS
        cursor.execute("SELECT id,name,event_date,venue,price FROM events")
        events = cursor.fetchall()


        # =========================
        # EVENT SPECIFIC QUESTIONS
        # =========================

        for e in events:

            if e["name"].lower() in user_message:

                # categories
                if "category" in user_message or "categories" in user_message:

                    cursor.execute("""
                    SELECT category_name
                    FROM event_categories
                    WHERE event_id=%s
                    """,(e["id"],))

                    categories = cursor.fetchall()

                    if categories:

                        cat_list = ", ".join([c["category_name"] for c in categories])

                        return jsonify({
                        "response": f"{e['name']} has the following categories: {cat_list}."
                        })

                    else:
                        return jsonify({
                        "response": f"No categories available for {e['name']}."
                        })


                # event details
                return jsonify({
                "response": f"{e['name']} will be held on {e['event_date']} at {e['venue']}. Fee: ₹{e['price']}."
                })


        # =========================
        # GREETING
        # =========================

        if "hello" in user_message or "hi" in user_message:
            return jsonify({"response": f"Hello {username}! I am your Eventopia assistant. Ask me about events."})


        # =========================
        # WHO IS USING
        # =========================

        if "who am i" in user_message or "who is using the system" in user_message:
            return jsonify({"response": f"You are logged in as {username}."})


        # =========================
        # EVENT LIST
        # =========================

        if "event" in user_message:

            names = ", ".join([e["name"] for e in events])

            return jsonify({
            "response": f"Available events are: {names}"
            })


        # =========================
        # FREE EVENTS
        # =========================

        if "free event" in user_message:

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

        if "register" in user_message:

            return jsonify({
            "response": "To register: Go to Events → Select event → Click Register → Fill the form."
            })


        return jsonify({
        "response": "Ask me about events, categories, fees, or registration."
        })


    except Exception as e:

        print("AI ERROR:",e)

        return jsonify({
        "response":"AI assistant error"
        })
@app.route("/events")
def events_page():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM events")
    events = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template("events.html", events=events)
    
@app.route("/event_categories/<int:event_id>")
def event_categories(event_id):

    conn = get_db_coonection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM event_categories WHERE event_id=%s",(event_id,))
    categories = cursor.fetchall()

    cursor.execute("SELECT name FROM events WHERE id=%s",(event_id,))
    event = cursor.fetchone()

    cursor.close()
    conn.close()

    return render_template("event_categories.html",categories=categories,event=event)
@app.route("/register/<int:category_id>", methods=["GET","POST"])
def register_event(category_id):

    conn = get_db_coonection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM event_categories WHERE id=%s",(category_id,))
    category = cursor.fetchone()

    # get event info
    cursor.execute("SELECT * FROM events WHERE id=%s",(category["event_id"],))
    event = cursor.fetchone()

    if request.method == "POST":

        name = request.form["name"]
        email = request.form["email"]
        phone = request.form["phone"]
        branch=request.form["branch"]
        student_class=request.form["class"]
        cursor.execute("""
        INSERT INTO registrations_new(event_id,category_id,name,email,phone)
        VALUES(%s,%s,%s,%s,%s)
        """,(category["event_id"],category_id,name,email,phone))

        conn.commit()

        # =====================
        # SEND EMAIL
        # =====================

        message = f"""
Congratulations {name}!

You are successfully registered for:

Event: {event['name']}
Category: {category['category_name']}
Venue: {event['venue']}
Date: {event['event_date']}
Time: {event['event_time']}

We look forward to seeing you there!

Eventopia Team
"""

        msg = MIMEText(message)

        msg["Subject"] = "Event Registration Confirmation"
        msg["From"] = "atharvkudtarkar4406@gmail.com"
        msg["To"] = email

        try:
            server = smtplib.SMTP("smtp.gmail.com",587)
            server.starttls()
            server.login("atharvkudtarkar4406@gmail.com","dxnt tdxx egdg sgua")
            server.send_message(msg)
            server.quit()
        except:
            print("Email sending failed")

        return render_template(
            "registration_success.html",
            event=event,
            category=category,
            name=name
        )

    return render_template("registration.html",category=category)
@app.route("/add_category", methods=["POST"])
def add_category():

    event_id = request.form["event_id"]
    category_name = request.form["category_name"]

    conn = get_db_coonection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO event_categories(event_id,category_name) VALUES(%s,%s)",
        (event_id,category_name)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return redirect("/admin")
@app.route("/delete_event/<int:id>")
def delete_event(id):

    conn = get_db_coonection()
    cursor = conn.cursor()

    # delete registrations first
    cursor.execute("""
    DELETE FROM registrations_new 
    WHERE event_id=%s
    """,(id,))

    # delete categories
    cursor.execute("""
    DELETE FROM event_categories 
    WHERE event_id=%s
    """,(id,))

    # delete event
    cursor.execute("""
    DELETE FROM events 
    WHERE id=%s
    """,(id,))

    conn.commit()
    cursor.close()
    conn.close()

    return redirect("/admin")

@app.route("/delete_user/<int:id>")
def delete_user(id):

    conn = get_db_coonection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM registrations_new WHERE id=%s",(id,))

    conn.commit()
    cursor.close()
    conn.close()

    return redirect("/admin")
@app.route('/add_event', methods=['POST'])
def add_event():

    name = request.form['name']
    description = request.form['description']
    category = request.form['category']
    event_date = request.form['event_date']
    event_time = request.form['event_time']
    venue = request.form['venue']

    image_file = request.files['image']
    filename = None

    if image_file and image_file.filename != "":
        filename = secure_filename(image_file.filename)
        image_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        image_file.save(image_path)

    conn = get_db_coonection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO events 
        (name, description, category, event_date, event_time, venue, image)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (name, description, category, event_date, event_time, venue, filename))

    conn.commit()
    cursor.close()
    conn.close()

    return redirect('/events')
@app.route("/admin_login", methods=["GET","POST"])
def admin_login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        if email == "admin@gmail.com" and password == "1234":
            session["admin"] = True
            return redirect("/admin")

    return render_template("admin_login.html")
@app.route("/admin")
def admin():

    if "admin" not in session:
        return redirect("/admin_login")

    conn = get_db_coonection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM events")
    events = cursor.fetchall()

    cursor.execute("""
        SELECT r.id,
               r.name,
               r.email,
               e.name AS event_name,
               c.category_name
        FROM registrations_new r
        JOIN events e ON r.event_id = e.id
        JOIN event_categories c ON r.category_id = c.id
    """)

    users = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template("admin.html", events=events, users=users)


@app.route("/download_registrations")
def download_registrations():

    conn = get_db_coonection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
    SELECT r.id,
           r.name,
           r.email,
           r.phone,
           e.name AS event_name,
           c.category_name
    FROM registrations_new r
    JOIN events e ON r.event_id = e.id
    JOIN event_categories c ON r.category_id = c.id
    """)

    data = cursor.fetchall()

    # Convert to dataframe
    df = pd.DataFrame(data)

    # Save Excel file
    file_path = "registrations.xlsx"
    df.to_excel(file_path, index=False)

    return send_file(file_path, as_attachment=True)
# ==========================
# RUN APP
# ==========================
if __name__ == "__main__":
    app.run(debug=True)