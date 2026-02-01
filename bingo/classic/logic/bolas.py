import random


class BomboBingo:
    def __init__(self):
        self.bolas = list(range(1, 76))
        random.shuffle(self.bolas)
        self.historial = []
        self.actual = None

    def sacar_bola(self):
        if not self.bolas:
            return None

        self.actual = self.bolas.pop()
        self.historial.append(self.actual)
        return self.actual

    def bolas_restantes(self):
        return len(self.bolas)

    def reset(self):
        self.__init__()
