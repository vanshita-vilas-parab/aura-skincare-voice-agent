import json
import os
import re

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None


# Mock order database used by the assignment.
ORDERS = {
    "ORD-101": {
        "customer": "Priya Sharma",
        "product": "Vitamin C Serum (30ml)",
        "value": 699,
        "status": "Out for Delivery",
        "courier": "BlueDart",
        "tracking_id": "BD-982103",
        "notes": "Expected by 6 PM today",
    },
    "ORD-102": {
        "customer": "Rahul Verma",
        "product": "Hydrating Sunscreen SPF 50",
        "value": 499,
        "status": "Delivered",
        "courier": "Delhivery",
        "tracking_id": "DL-441029",
        "notes": "Delivered 14 days ago",
    },
    "ORD-103": {
        "customer": "Ananya Patel",
        "product": "Green Tea Face Wash + Toner",
        "value": 850,
        "status": "Processing",
        "courier": None,
        "tracking_id": None,
        "notes": "Ordered 3 hours ago. Eligible for cancellation",
    },
}


BRAND_POLICIES = """
You are Aria, a friendly, empathetic, professional customer support agent
for Aura Skincare, a premium organic Indian skincare brand.

BRAND POLICIES

1. SHIPPING
- Free delivery on orders of ₹499 or more.
- Orders below ₹499 have a ₹50 shipping fee.
- Standard delivery takes 3–5 business days.

2. RETURNS AND REFUNDS
- Returns are accepted within 7 days of delivery.
- Products must be unopened, unused, and in their original packaging.
- Do not guarantee or approve refunds.
- Do not claim a return has been initiated or will be processed.
- Do not invent refund procedures or timelines.
- For general return-policy questions, explain only the eligibility requirements above.

3. DAMAGED OR DEFECTIVE PRODUCTS
- Damage or defects must be reported within 48 hours of delivery.
- Photos of the damaged or defective product are required to request a replacement.
- When a customer reports a damaged or defective product, always mention
  the 48-hour reporting deadline and the photo requirement.
- If the customer asks what to do, explain these requirements directly.
- A replacement is not guaranteed or automatically approved.
- Do not invent additional requirements, review processes, or procedures.

4. CANCELLATIONS
- Orders can only be cancelled while their status is Processing.
- Shipped and Out for Delivery orders cannot be cancelled.
- Customers may refuse delivery at the doorstep.
- Never claim to have cancelled an order.
- Never offer to perform a cancellation.
- If an order is Processing, explain that it is eligible for cancellation,
  but do not claim cancellation was requested or completed.

5. CASH ON DELIVERY
- COD is available for orders up to ₹2,500.
- Customers can pay by cash or UPI at the doorstep.

STRICT RULES
- Only answer questions related to Aura Skincare.
- Use supplied order information as the source of truth.
- Never invent order details, policies, contact information, or procedures.
- Never claim an action has been completed when it has not.
- Ask for an order ID only when needed to answer a question about a specific order.
  Do not require an order ID to explain general policies.
- Valid order IDs follow the format ORD-101, ORD-102, or ORD-103.
- If a customer provides an order ID that does not match a known order,
  clearly state that the order could not be found and ask them to verify
  the order ID.
- Do not treat an invalid order ID as merely unclear or ask the customer
  to repeat it without explaining that it could not be found.
- If the customer says something that could be a misheard order ID,
  such as "OLD 101", do not assume it is a valid order ID. Ask them to
  confirm whether they meant ORD-101.
- Do not ask for email addresses.
- Do not promise refunds, replacements, cancellations, or approvals.
- If information is unavailable, acknowledge the limitation.

RESPONSE STYLE
- Be empathetic, natural, concise, and professional.
- When a customer reports damage, acknowledge their concern first.
- For a general damaged-product question, explain the policy directly.
- Do not ask for an order ID before explaining a general policy.
- Do not repeat the same apology or request in consecutive responses.
- Use 2–3 complete sentences for ordinary questions.
- Use plain, conversational English without Markdown tables.
- Never end a response mid-sentence.
"""


def get_order_details(order_id):
    """Retrieve an order from the mock order database."""
    if not order_id:
        return None
    return ORDERS.get(order_id.strip().upper())


def find_order_id(text):
    """Find a supported order ID in a message."""
    match = re.search(r"\bORD\s*[- ]?\s*(101|102|103)\b", text, re.IGNORECASE)
    return f"ORD-{match.group(1)}" if match else None


@app.route("/")
def home():
    return jsonify({
        "message": "Aura Skincare AI Voice Agent API",
        "status": "running",
    })


@app.route("/api/orders", methods=["GET"])
def get_all_orders():
    return jsonify(ORDERS)


@app.route("/api/orders/<order_id>", methods=["GET"])
def get_order_details_route(order_id):
    order = get_order_details(order_id)
    if not order:
        return jsonify({
            "error": "Order not found",
            "order_id": order_id,
        }), 404

    return jsonify({
        "order_id": order_id.strip().upper(),
        **order,
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    if not client:
        return jsonify({"error": "Groq API key is not configured."}), 500

    data = request.get_json(silent=True) or {}
    message = data.get("message", "")
    if not isinstance(message, str):
        return jsonify({"error": "Message must be text."}), 400

    message = message.strip()
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "Please provide a message."}), 400

    message_lower = message.lower()
    order_id = find_order_id(message)

    # General cancellation-policy questions should not require an order ID.
    general_cancellation_question = (
        any(word in message_lower for word in ("cancel", "cancellation"))
        and any(
            phrase in message_lower
            for phrase in (
                "what if",
                "what about",
                "can i cancel an order",
                "can orders be cancelled",
                "can orders be canceled",
                "already been shipped",
                "out for delivery",
                "shipped",
            )
        )
        and order_id is None
    )
    if general_cancellation_question:
        return jsonify({
            "reply": (
                "Orders can only be cancelled while they are Processing. "
                "Once an order has been shipped or is Out for Delivery, it "
                "cannot be cancelled; you may refuse delivery at the doorstep."
            ),
            "order_id": None,
        })

    # General damaged-product questions can be answered without an order ID.
    damaged_keywords = ("damaged", "defective", "broken")
    if any(keyword in message_lower for keyword in damaged_keywords):
        if not order_id:
            return jsonify({
                "reply": (
                    "I'm sorry to hear that. Please report a damaged or defective "
                    "product within 48 hours of delivery and provide photos to "
                    "request a replacement. A replacement is not guaranteed."
                ),
                "order_id": None,
            })

        order = get_order_details(order_id)
        if not order:
            return jsonify({
                "reply": f"I couldn't find {order_id}. Please check the order ID.",
                "order_id": order_id,
            })

    # Handle cancellation questions about a specific order deterministically.
    if any(keyword in message_lower for keyword in ("cancel", "cancellation")):
        if not order_id:
            return jsonify({
                "reply": (
                    "Orders can only be cancelled while their status is Processing. "
                    "If you want me to check a specific order's eligibility, please "
                    "share its order ID."
                ),
                "order_id": None,
            })

        order = get_order_details(order_id)
        if not order:
            return jsonify({
                "reply": f"I couldn't find {order_id}. Please check the order ID.",
                "order_id": order_id,
            })

        status = order.get("status", "").lower()
        if status == "processing":
            reply = (
                f"Your order {order_id} is currently Processing and is eligible "
                "for cancellation. I cannot cancel the order directly."
            )
        elif status in ("shipped", "out for delivery"):
            reply = (
                f"Your order {order_id} is already {order.get('status')}, so it "
                "cannot be cancelled. You may refuse delivery at the doorstep."
            )
        else:
            reply = (
                f"Your order {order_id} has status {order.get('status')}. "
                "The cancellation policy only allows cancellation while an "
                "order is Processing."
            )

        return jsonify({"reply": reply, "order_id": order_id})

    # Handle COD questions deterministically.
    cod_keywords = (
        "cod",
        "cash on delivery",
        "pay by cash",
        "pay by upi",
        "cash or upi",
        "payment at the doorstep",
        "pay when my order arrives",
    )
    if any(keyword in message_lower for keyword in cod_keywords):
        return jsonify({
            "reply": (
                "Cash on Delivery (COD) is available for orders up to ₹2,500. "
                "You can pay by cash or UPI at the doorstep."
            ),
            "order_id": order_id,
        })

    # Provide authoritative order information to the model when an ID is present.
    order_context = "No order ID was provided in this message."
    if order_id:
        order = get_order_details(order_id)
        if order:
            order_context = json.dumps({"order_id": order_id, **order}, ensure_ascii=False)
        else:
            order_context = (
                f"The order ID {order_id} does not exist in the database. "
                "Do not invent its details."
            )

    messages = [{
        "role": "system",
        "content": (
            BRAND_POLICIES
            + "\n\nORDER INFORMATION:\n"
            + order_context
            + "\n\nUse supplied order information when answering. Do not claim "
              "that you have cancelled an order or processed a refund. For "
              "general policy questions, answer the policy directly without "
              "requesting an order ID."
        ),
    }]

    # Keep only recent, valid conversation messages.
    if isinstance(history, list):
        for item in history[-10:]:
            if (
                isinstance(item, dict)
                and item.get("role") in ("user", "assistant")
                and isinstance(item.get("content"), str)
            ):
                messages.append({
                    "role": item["role"],
                    "content": item["content"][:2000],
                })

    messages.append({"role": "user", "content": message})

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            temperature=0.1,
            max_tokens=500,
        )
        reply = response.choices[0].message.content or ""
        reply = reply.strip()

        if not reply:
            app.logger.error("Groq returned an empty chat response.")
            return jsonify({
                "reply": "I'm sorry, I'm having trouble responding right now. Please try again.",
                "order_id": order_id,
            }), 502

        return jsonify({"reply": reply, "order_id": order_id})

    except Exception:
        app.logger.exception("Groq API request failed")
        return jsonify({
            "error": "I'm having trouble responding right now. Please try again."
        }), 502


@app.route("/api/summarize", methods=["POST"])
def summarize_call():
    if not client:
        return jsonify({"error": "Groq API key is not configured."}), 500

    data = request.get_json(silent=True) or {}
    transcript = data.get("transcript", [])

    if not isinstance(transcript, list) or not transcript:
        return jsonify({"error": "A conversation transcript is required."}), 400

    conversation = []
    for item in transcript:
        if (
            isinstance(item, dict)
            and item.get("role") in ("user", "assistant")
            and isinstance(item.get("content"), str)
        ):
            content = item["content"].strip()
            if content:
                speaker = "Customer" if item["role"] == "user" else "Aria"
                conversation.append(f"{speaker}: {content[:2000]}")

    if not conversation:
        return jsonify({"error": "No valid conversation messages were found."}), 400

    # Limit very long transcripts while retaining the beginning and latest context.
    transcript_text = "\n".join(conversation)
    if len(transcript_text) > 14000:
        transcript_text = (
            transcript_text[:5000]
            + "\n[Earlier conversation truncated for length]\n"
            + transcript_text[-8500:]
        )

    system_prompt = (
        "You summarize customer support conversations accurately and concisely. "
        "Use only facts explicitly supported by the transcript. Return one paragraph, "
        "not JSON. Do not claim an order was cancelled, a refund was processed, or a "
        "replacement was issued unless the transcript explicitly confirms it."
    )
    user_prompt = (
        "Write a concise 2–4 sentence paragraph summarizing this Aura Skincare "
        "support conversation. Include the customer's main issues, the important "
        "answers/policies Aria provided, and relevant order IDs, statuses, courier "
        "or tracking details where applicable. If multiple topics were discussed, "
        "cover the most important ones. Ignore greetings, repeated questions, and "
        "small talk. Do not repeat the customer's wording verbatim.\n\n"
        f"Transcript:\n{transcript_text}"
    )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=300,
        )

        summary = (response.choices[0].message.content or "").strip()

        # Retry once with a shorter prompt if the model returns an empty result.
        if not summary:
            app.logger.warning("Groq returned an empty summary; retrying once.")
            retry_response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {
                        "role": "system",
                        "content": "Summarize the conversation in one accurate paragraph.",
                    },
                    {
                        "role": "user",
                        "content": (
                            "Summarize the customer's main questions and Aria's "
                            "important answers. Use only transcript facts. Return "
                            "only a short paragraph.\n\n"
                            + transcript_text[-8000:]
                        ),
                    },
                ],
                temperature=0.1,
                max_tokens=250,
            )
            summary = (retry_response.choices[0].message.content or "").strip()

        if not summary:
            app.logger.error("Groq returned an empty summary after retry.")
            return jsonify({
                "error": "The AI could not generate a summary. Please try again."
            }), 502

        return jsonify({"summary": summary})

    except Exception:
        app.logger.exception("Call summarization failed")
        return jsonify({
            "error": "Could not generate the call summary."
        }), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)
