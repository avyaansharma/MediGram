import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from langchain_core.runnables.history import RunnableWithMessageHistory
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get the Groq API Key
api_key = "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"
if not api_key:
    raise ValueError("GROQ_API_KEY not found. Please add it to your .env file.")

# Initialize the LLM with valid Groq model
def get_llm():
    return ChatGroq(groq_api_key=api_key, model_name="gemma2-9b-it")

# Store for chat histories and global context
chat_store = {}
global_context = {}

def get_session_history(session):
    if session not in chat_store:
        chat_store[session] = ChatMessageHistory()
    return chat_store[session]

def update_global_context(user_input, session_id):
    existing_ctx = global_context.get(session_id, "")
    
    context_prompt = ChatPromptTemplate.from_messages([
        ("system", """
        You are analyzing a conversation with a mental health patient.
        Extract key personal information from the user's message that might be relevant for future sessions.
        Focus on: 
        - Demographic information
        - Mental health indicators
        - Lifestyle details
        - Medical conditions
        - Family members' names and their personal information
        
        Update existing context with new information. Provide a concise, organized summary.
        
        Existing context:
        {existing_context}
        """),
        ("human", f"New message from session {session_id}: {user_input}")
    ])
    
    context_chain = context_prompt | get_llm()
    updated_context = context_chain.invoke(
        {"existing_context": existing_ctx}
    ).content
    
    global_context[session_id] = updated_context
    return updated_context

# Create conversational chain
def get_conversation_chain():
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
         You are a kind psychiatrist helping with mental health issues. 
         GLOBAL CONTEXT: {global_context}
         
         Gather key information naturally:
         1. Basic demographics
         2. Sleep patterns
         3. Daily routine
         4. Stress factors
         5. Social support
         
         Be empathetic and conversational. Only give medical advice when sufficient information is gathered.
         """),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])

    chain = prompt | get_llm()
    return chain

# Routes
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data or 'message' not in data or 'session_id' not in data:
            return jsonify({"error": "Missing required fields (message, session_id)"}), 400
        
        user_message = data['message']
        session_id = data['session_id']
        
        print(f"Received message: '{user_message}' for session: {session_id}")
        
        # Update global context
        try:
            context = update_global_context(user_message, session_id)
            print(f"Updated context for session {session_id}: {context[:100]}...")
        except Exception as e:
            print(f"Error updating context: {str(e)}")
            # Continue even if context update fails
        
        # Get conversation chain
        conversational_chain = RunnableWithMessageHistory(
            get_conversation_chain(),
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )
        
        # Invoke conversation chain
        print(f"Invoking conversation chain for session {session_id}")
        response = conversational_chain.invoke(
            {"input": user_message, "global_context": global_context.get(session_id, "")},
            config={"configurable": {"session_id": session_id}},
        )
        print(f"Got response for session {session_id}")
        
        # Get chat history
        history = get_session_history(session_id)
        messages = [{"role": msg.type, "content": msg.content} for msg in history.messages]
        
        print(f"Returning response for session {session_id}")
        return jsonify({
            "response": response.content,
            "history": messages,
            "global_context": global_context.get(session_id, "")
        })
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/context', methods=['GET'])
def get_context():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "Missing required parameter (session_id)"}), 400
    
    return jsonify({
        "context": global_context.get(session_id, "")
    })

@app.route('/context', methods=['DELETE'])
def reset_context():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "Missing required parameter (session_id)"}), 400
    
    if session_id in global_context:
        global_context[session_id] = ""
    
    return jsonify({
        "success": True,
        "message": f"Context for session {session_id} has been reset"
    })

@app.route('/history', methods=['GET'])
def get_history():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "Missing required parameter (session_id)"}), 400
    
    history = get_session_history(session_id)
    messages = [{"role": msg.type, "content": msg.content} for msg in history.messages]
    
    return jsonify({
        "history": messages
    })

if __name__ == '__main__':
    # Disable auto-reloading to prevent interruptions between requests
    app.run(debug=False, host='0.0.0.0', port=5001)