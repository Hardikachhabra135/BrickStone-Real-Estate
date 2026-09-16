from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# This allows our frontend to securely send data to this backend
CORS(app) 

# 1. A simple test route to check if the server is awake
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Brickstone Backend is running perfectly!"})

# 2. The route that will handle our Contact Form submissions
@app.route('/api/contact', methods=['POST'])
def handle_contact():
    # Capture the data sent from the frontend
    data = request.json

    # Print it to the VS Code terminal so you can see it working
    print("\n--- NEW INQUIRY RECEIVED ---")
    print(f"Name: {data.get('fullName')}")
    print(f"Email: {data.get('email')}")
    print(f"Reason: {data.get('reason')}")
    print("----------------------------\n")

    # Send a success message back to the website
    return jsonify({
        "status": "success", 
        "message": "Inquiry received successfully."
    }), 200

if __name__ == '__main__':
    # Starts the server on port 5000
    app.run(debug=True, port=5000)