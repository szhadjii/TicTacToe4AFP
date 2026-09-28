WIN_LENGTH = {3: 3}
SIZES = tuple(WIN_LENGTH)

class Game:
    def __init__(self, size=3):
        if size not in WIN_LENGTH:
            raise ValueError("Nem támogatott táblaméret!")
        self.size = size
        self.table = [["" for _ in range(size)] for _ in range(size)]
        self.next = "X"
        self.status = "in progress"
        self.winning_fields = []