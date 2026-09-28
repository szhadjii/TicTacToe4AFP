from flask import Flask, jsonify, request

from game import Game, SIZES

app = Flask(__name__)
game = Game(3)

@app.route("/")
def index():
    return app.send_static_file('index.html')

@app.route("/new_game", methods=['POST'])
def new_game():
    global game
    data = request.get_json()
    size = data.get("size", 3)
    if size not in SIZES:
        return jsonify({"error": "Ez a táblaméret nem támogatott."}), 400
    game = Game(size)
    return jsonify(game.state())


if __name__ == "__main__":
    app.run(debug=True)