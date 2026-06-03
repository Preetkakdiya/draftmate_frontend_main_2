import sys
import os
import importlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Helper function to dynamically import sub-apps with their local directories in sys.path
def load_sub_app(subapp_dir_name, module_name):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    subapp_path = os.path.join(backend_dir, subapp_dir_name)
    
    # Save original sys.path
    original_path = list(sys.path)
    
    # Prepend the sub-app folder to ensure local imports inside the sub-app resolve correctly
    sys.path.insert(0, subapp_path)
    
    try:
        module = importlib.import_module(module_name)
        app = getattr(module, "app")
        print(f"✅ Successfully loaded sub-app: {subapp_dir_name}/{module_name}")
        return app
    except Exception as e:
        print(f"❌ Failed to load sub-app {subapp_dir_name}/{module_name}: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        # Restore original path
        sys.path = original_path

# Create the master API application
app = FastAPI(
    title="DraftMate Unified API",
    description="Unified API Gateway merging all backend microservices into a single process.",
    version="1.0.0"
)

# Configure CORS for the gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Health Check
@app.get("/")
def root_health():
    return {"status": "healthy", "service": "unified-api-gateway"}

# Dynamically mount all sub-applications
print("🚀 Loading and mounting all DraftMate microservices...")

auth_app = load_sub_app("login_db", "auth")
converter_app = load_sub_app("converter", "Converter")
query_app = load_sub_app("query", "Query")
enhance_app = load_sub_app("Enhance_bot", "Enhance")
drafter_app = load_sub_app("Drafter", "Drafter")
lex_bot_app = load_sub_app("Deep_research", "lex_bot.app")
pdf_editor_app = load_sub_app("PDF_Editor", "api")
notification_app = load_sub_app("Notification", "app")
subscriptions_app = load_sub_app("subscriptions", "app")
case_search_app = load_sub_app("Case_search", "app")

# Mount them under the correct Nginx proxy-stripped routing prefixes
app.mount("/auth", auth_app)
app.mount("/converter", converter_app)
app.mount("/query", query_app)
app.mount("/enhance", enhance_app)
app.mount("/drafter", drafter_app)
app.mount("/lexbot", lex_bot_app)
app.mount("/pdf", pdf_editor_app)
app.mount("/notification", notification_app)
app.mount("/subscriptions", subscriptions_app)
app.mount("/case_search", case_search_app)

print("🎉 All services successfully unified and mounted!")
