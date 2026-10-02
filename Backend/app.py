from flask import Flask, jsonify, request
from game import Game, SIZES, TurnException

app = Flask(__name__, static_url_path="", static_folder="../frontend")
game = Game(3)

@app.route("/")
def index():
    return app.send_static_file('index.html')

@app.route("/new-game", methods=['POST'])
def new_game():
    global game
    data = request.get_json(silent=True) or {}
    size = data.get("size", 3)
    if size not in SIZES:
        return jsonify({"error": "Ez a táblaméret nem támogatott."}), 400
    game = Game(size)
    return jsonify(game.state())

@app.route("/turn", methods=['POST'])
def turn():
    data = request.get_json(silent=True) or {}
    try:
        game.turn(data.get("row"), data.get("col"))
    except TurnException as e:
        return jsonify({"error": e.message}, e.http_code)
    return jsonify(game.state())

@app.route("/state", methods=['GET'])
def state():
    return jsonify(game.state())


if __name__ == "__main__":
    app.run(debug=True)