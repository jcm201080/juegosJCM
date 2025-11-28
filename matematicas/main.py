from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
import random

class MathGame(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        self.padding = 20
        self.spacing = 20
        
        # Etiqueta para mostrar la operación
        self.operation_label = Label(
            text='Resuelve la operación:',
            font_size='30sp',
            size_hint=(1, 0.3)
        )
        self.add_widget(self.operation_label)
        
        # Etiqueta para mostrar el problema matemático
        self.problem_label = Label(
            text='',
            font_size='40sp',
            size_hint=(1, 0.3)
        )
        self.add_widget(self.problem_label)
        
        # Campo de entrada para la respuesta
        self.answer_input = TextInput(
            multiline=False,
            font_size='30sp',
            size_hint=(1, 0.2),
            input_filter='int'
        )
        self.answer_input.bind(on_text_validate=self.check_answer)
        self.add_widget(self.answer_input)
        
        # Botón para verificar
        self.check_button = Button(
            text='Verificar',
            font_size='30sp',
            size_hint=(1, 0.2)
        )
        self.check_button.bind(on_press=self.check_answer)
        self.add_widget(self.check_button)
        
        # Etiqueta para mostrar el resultado
        self.result_label = Label(
            text='',
            font_size='25sp',
            size_hint=(1, 0.3)
        )
        self.add_widget(self.result_label)
        
        # Contadores
        self.score = 0
        self.attempts = 0
        
        # Generar el primer problema
        self.generate_problem()
    
    def generate_problem(self):
        # Generar números aleatorios y operación
        self.num1 = random.randint(1, 20)
        self.num2 = random.randint(1, 20)
        operations = ['+', '-', '*']
        self.operation = random.choice(operations)
        
        # Calcular la respuesta correcta
        if self.operation == '+':
            self.correct_answer = self.num1 + self.num2
        elif self.operation == '-':
            # Asegurar que el resultado no sea negativo
            if self.num1 < self.num2:
                self.num1, self.num2 = self.num2, self.num1
            self.correct_answer = self.num1 - self.num2
        else:  # multiplicación
            self.num1 = random.randint(1, 10)
            self.num2 = random.randint(1, 10)
            self.correct_answer = self.num1 * self.num2
        
        # Mostrar el problema
        self.problem_label.text = f'{self.num1} {self.operation} {self.num2} = ?'
        self.answer_input.text = ''
        self.result_label.text = ''
    
    def check_answer(self, instance):
        try:
            user_answer = int(self.answer_input.text)
            self.attempts += 1
            
            if user_answer == self.correct_answer:
                self.score += 1
                self.result_label.text = f'¡Correcto! Puntuación: {self.score}/{self.attempts}'
                self.result_label.color = (0, 1, 0, 1)  # Verde
            else:
                self.result_label.text = f'Incorrecto. La respuesta era {self.correct_answer}. Puntuación: {self.score}/{self.attempts}'
                self.result_label.color = (1, 0, 0, 1)  # Rojo
            
            # Generar nuevo problema después de 1.5 segundos
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: self.generate_problem(), 1.5)
            
        except ValueError:
            self.result_label.text = 'Por favor, ingresa un número válido'
            self.result_label.color = (1, 0.5, 0, 1)  # Naranja

class MathGameApp(App):
    def build(self):
        self.title = 'Juego de Matemáticas'
        return MathGame()

if __name__ == '__main__':
    MathGameApp().run()