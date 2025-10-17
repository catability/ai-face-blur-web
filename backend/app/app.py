from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from app.config import Config

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    from app.routes.video_routes import video_bp
    from app.routes.job_routes import job_bp

    app.register_blueprint(video_bp)
    app.register_blueprint(job_bp)

    @app.route("/", methods=["GET"])
    def index():
        return render_template("index.html")
    
    return app