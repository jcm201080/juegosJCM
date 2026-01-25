from datetime import datetime
from db import db

class Visita(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    ip = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    ruta = db.Column(db.String(255))
