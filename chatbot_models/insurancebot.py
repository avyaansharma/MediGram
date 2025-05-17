import os
from datetime import datetime
from rich.console import Console

# LangChain imports
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

console = Console()

# Configure API key
GEMINI_API_KEY = "AIzaSyCDxllOEiTUDxOHq1QpQQakjaxis-UPRuk"  # ← Replace with your real key when deploying

# ---------------------------
# Logging utility
# ---------------------------
def log_request(response: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    console.print(f"\n[dim]{timestamp} - INFO - LLM Response Generated[/dim]\n")

# ---------------------------
# 1. Knowledge Base
# ---------------------------
class InsuranceKnowledgeBase:
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=GEMINI_API_KEY
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=200,
            separators=["\n\n", "\n", "•", "SECTION", "(?<=\\. )"]
        )
        self.vector_store = None

    def load_policies(self, pdf_dir: str):
        docs = []
        for filename in os.listdir(pdf_dir):
            if filename.endswith(".pdf"):
                try:
                    loader = PyPDFLoader(os.path.join(pdf_dir, filename))
                    pages = loader.load_and_split(self.text_splitter)
                    for page in pages:
                        page.metadata["source"] = filename
                    docs.extend(pages)
                except Exception as e:
                    console.print(f"[red]Error loading {filename}: {str(e)}[/red]")
        self.vector_store = FAISS.from_documents(docs, self.embeddings)

    def query_policies(self, query: str, k: int = 5):
        if not self.vector_store:
            raise ValueError("Vector store not initialized. Please load policies first.")
        
        docs = self.vector_store.similarity_search(query, k=k)
        return [{"source": doc.metadata.get("source", "Unknown"), "content": doc.page_content} for doc in docs]

# ---------------------------
# 2. Insurance Advisor
# ---------------------------
class InsuranceAdvisor:
    def __init__(self, knowledge_base: InsuranceKnowledgeBase):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.3,
            google_api_key=GEMINI_API_KEY
        )
        self.knowledge_base = knowledge_base
        self.memory = []
        self.prompt = self._create_prompt_template()

    def _create_prompt_template(self):
        return ChatPromptTemplate.from_messages([
            ("system", """🤖 You are HealthGuard Advisor, an expert health insurance consultant. Your responses should be:
- Friendly and encouraging
- Focused on understanding user needs
- Grounded in policy documents
- Ask clarifying questions when needed
- Provide clear comparisons with policy names
- Highlight important features/exclusions

Use this format:
1. Acknowledge user input
2. Present relevant information from policies
3. Ask next logical question
4. Use emojis sparingly for engagement"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])

    def _format_context(self, policy_info: list) -> str:
        context = "Relevant Policy Information:\n"
        for doc in policy_info:
            context += f"\n📄 From {doc['source']}:\n{doc['content']}\n"
        return context

    def generate_response(self, user_input: str) -> str:
        policy_info = self.knowledge_base.query_policies(user_input, k=6)
        context = self._format_context(policy_info)

        chain = self.prompt | self.llm
        response = chain.invoke({
            "input": (
                f"The user asked: {user_input}\n\n"
                f"{context}\n\n"
                "Based on the information above, explain which insurance policy or policies may be suitable and why. "
                "Focus on explaining differences in premium, coverage, waiting period, or special benefits in a user-friendly way."
            ),
            "chat_history": self.memory
        })

        self.memory.append(HumanMessage(content=user_input))
        self.memory.append(AIMessage(content=response.content))

        log_request(response.content)
        return response.content

# ---------------------------
# 3. Chat Interface
# ---------------------------
class InsuranceChat:
    def __init__(self):
        self.knowledge_base = InsuranceKnowledgeBase()
        self.advisor = InsuranceAdvisor(self.knowledge_base)
        console.print("\n🤖 [bold green]Welcome! I'm your Health Insurance Advisor[/bold green]")
        console.print("Ask me anything about health insurance policies\nType 'exit' to quit\n")

    def _save_chat(self, speaker, text):
        with open("chat_history.txt", "a", encoding="utf-8") as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            f.write(f"{timestamp} - {speaker}: {text}\n\n")

    def start_chat(self, pdf_dir: str):
        self.knowledge_base.load_policies(pdf_dir)

        # Warm intro message from advisor
        intro_message = (
            "👋 Hello! I'm glad you're here. Considering a health insurance policy is a wise and responsible decision. "
            "It’s an important financial step toward safeguarding your family and avoiding huge costs during medical emergencies. "
            "After all, prevention is better than cure! 🩺💡\n\n"
            "To help me find the best policies for you, please share a few details:\n"
            "- Your age and gender\n"
            "- Height and weight\n"
            "- Any pre-existing conditions (like diabetes, hypertension)\n"
            "- Any lifestyle habits (smoking, drinking)\n"
            "- Budget or premium expectations\n"
            "- Specific features you’re looking for (e.g. dental, maternity, cashless hospitals)\n\n"
            "Here are some common insurance terms to know:\n"
            "- **Premium**: The amount you pay (monthly or yearly) to keep the policy active.\n"
            "- **Sum Assured**: The total amount the insurer will pay in case of claims.\n"
            "- **Waiting Period**: Time before you can start using certain benefits (e.g., pre-existing disease coverage).\n"
            "- **Co-payment**: % of claim you have to pay from your side.\n"
            "- **No-Claim Bonus**: Reward for not claiming in a year (often increased coverage).\n"
        )
        console.print(f"\n🧠 [bold magenta]Advisor:[/bold magenta] {intro_message}")
        self._save_chat("Advisor", intro_message)

        # Chat loop
        while True:
            try:
                user_input = console.input("\n👤 [bold cyan]You: [/bold cyan]")
                if user_input.lower() == 'exit':
                    console.print("[green]Goodbye! Stay safe and insured. 🛡️[/green]")
                    break

                self._save_chat("User", user_input)

                response = self.advisor.generate_response(user_input)
                console.print(f"\n🧠 [bold magenta]Advisor:[/bold magenta] {response}")
                self._save_chat("Advisor", response)

            except KeyboardInterrupt:
                console.print("\n[red]Session interrupted. Take care![/red]")
                break

# ---------------------------
# 4. Entry Point
# ---------------------------
if __name__ == "__main__":
    pdf_directory = input("Enter path to PDF policies folder: ").strip().strip('"')
    chat = InsuranceChat()
    chat.start_chat(pdf_directory)
