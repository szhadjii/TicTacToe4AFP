WIN_LENGTH = {3: 3}
SIZES = tuple(WIN_LENGTH)
DIRECTIONS = ((0, 1), (1, 0), (1, 1), (1, -1))

class TurnException(Exception):
    def __init__(self, message, http_code):
        super().__init__(message)
        self.http_code = http_code
        self.message = message


class Game:
    def __init__(self, size=3):
        if size not in WIN_LENGTH:
            raise ValueError("Nem támogatott táblaméret!")
        self.size = size
        self.table = [["" for _ in range(size)] for _ in range(size)]
        self.next = "X"
        self.status = "in progress"
        self.winning_fields = []

    def turn(self, row, column):
        if self.status != "in progress":
            raise TurnException("A játék véget ért. Kezdj egy új játékot!", 409)

        if (not isinstance(row, int) or isinstance(row, bool) or not isinstance(column, int) or isinstance(column, bool)
                or not (0 <= row < self.size) or not (0 <= column < self.size)):
            raise TurnException("Érvénytelen mező.", 400)

        if self.table[row][column] != "":
            raise TurnException("Ez a mező foglalt!", 409)

        sign = self.next
        self.table[row][column] = sign

        winner = self._winning_field(sign)
        if winner:
            self.status = f"{sign} won!"
            self.winning_fields.append(winner)
        elif all(field != "" for rowlist in self.table for field in rowlist):
            self.status = "draw"
        else:
            self.next = "O" if sign == "X" else "X"


    def _winning_field(self, sign):
        length = WIN_LENGTH[self.size]
        for r in range(self.size):
            for c in range(self.size):
                for dr, dc in DIRECTIONS:
                    fields = [(r + i * dr, c + i * dc) for i in range(length)]
                    if all(0 <= wr < self.size and 0 <= wc < self.size
                           and self.table[wr][wc] == sign for (wr, wc) in fields):
                        return [[wr, wc] for wr, wc in fields]
        return []

    def state(self):
        return {
            "size": self.size,
            "table": self.table,
            "next": self.next,
            "status": self.status,
            "winning_fields": self.winning_fields
        }