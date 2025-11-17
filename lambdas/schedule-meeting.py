import json
import boto3
import random
import string
import os
from datetime import datetime, timezone

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = 'elephant-meetings'
table = dynamodb.Table(TABLE_NAME)

# Your Jitsi domain
# For best practice, set this as an Environment Variable in Lambda
# JITSI_DOMAIN = os.environ.get('JITSI_DOMAIN', 'meet.christardy.com')
JITSI_DOMAIN = 'meet.christardy.com'

def generate_id():
    """
    Generates a clean, URL-safe ID like 'M-gxpf1kp'
    """
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    return f"{suffix}"

def lambda_handler(event, context):
    print(f"EVENT RECEIVED: {json.dumps(event)}") # Verify input in CloudWatch

    payload = {}
    try:
        if 'body' in event and event['body'] is not None:
            # Handle API Gateway Proxy (body is a string)
            payload = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            # Handle Non-Proxy, direct test, or other invocations
            payload = event
            
    except Exception as e:
        print(f"PARSING ERROR: {e}")
        return { 
            'statusCode': 400, 
            'headers': { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            'body': json.dumps({'message': 'Invalid JSON format'}) 
        }

    # --- JITSI LOGIC ADDED ---
    
    # 1. Generate the unique ID
    meeting_id = generate_id()
    
    # 2. Create the permanent Jitsi URL
    jitsi_url = f"https://{JITSI_DOMAIN}/{meeting_id}"

    # 3. Add the URL to the database item
    item = {
        'id': meeting_id, 
        'teacher_name': payload.get('teacher_name'),
        'student_name': payload.get('student_name'),
        'meet_time': payload.get('meet_time'), 
        'jitsi_url': jitsi_url,  # <-- SAVED TO DB
        'status': 'SCHEDULED', 
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    # --- END OF JITSI LOGIC ---

    try:
        table.put_item(Item=item)
        
        # 4. Return the new URL to the frontend
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',  # Essential for frontend CORS
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'message': 'Session scheduled!', 
                'id': meeting_id,
                'jitsi_url': jitsi_url  # <-- RETURNED TO FRONTEND
            })
        }
    except Exception as db_error:
        print(f"DB ERROR: {db_error}")
        return { 
            'statusCode': 500, 
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'message': 'DB Write Error'}) 
        }