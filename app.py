import os
import json
import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request, send_file, send_from_directory
import requests
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential
from elasticsearch import Elasticsearch
from datetime import datetime
import copy
from werkzeug.utils import secure_filename
import time
from pprint import pprint

IMAGE_ANALYSIS_ENDPOINT = "https://<your-imageanalysis-resource>.cognitiveservices.azure.com/"
IMAGE_ANALYSIS_KEY = "<your-imageanalysis-key>"
ELASTIC_CLOUD_ID = "<your-elastic-cloudid>"
ELASTIC_KEY = "<your-elastic-key"
ELASTIC_INDEX = "<your-elastic-index>"

uploads_dir = 'uploads'
if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)

UPLOADS_FOLDER = 'uploads'
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOADS_FOLDER 

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        image_url = f'uploads/{filename}'  
        return jsonify({'imageUrl': image_url}), 200
    
@app.route('/search', methods=['POST'])
def get_result():
    data = request.get_json()
    file_name = copy.deepcopy(data['filename'])
    print(file_name)
    file_name = file_name.replace(" ", '_')
    img_path = "uploads/" + file_name
    print(img_path)
    img = cv2.imread(img_path)

    # Create an Image Analysis client
    client = ImageAnalysisClient(
        endpoint= IMAGE_ANALYSIS_ENDPOINT,
        credential= AzureKeyCredential(IMAGE_ANALYSIS_KEY)
    )

    with open(img_path, "rb") as f:
        image_data = f.read()

    # Get a caption for the image. This will be a synchronously (blocking) call.
    result = client.analyze(
        image_data = image_data,
        visual_features= [VisualFeatures.READ],
        gender_neutral_caption=True,  # Optional (default is False)
    ) 

    print("Image analysis results:")
    search_with_every_word = ""
    #search_with_first_five_words = ""
    #search_with_last_five_words = "" 

    # Print text (OCR) analysis results to the console
    print(" Read:")
    if result.read is not None:

        word_list = []
        line_list = []
        biggest_line_words = []
        biggest_area = 0
        area_updated = False
        response = result.read
        print(response)

        for line in response.blocks[0].lines:

            points = [(point['x'], point['y']) for point in line['boundingPolygon']]

            # Draw rectangle around the line
            cv2.polylines(img, [np.array(points)], isClosed=True, color=(0, 255, 0), thickness=2)
            area = cv2.contourArea(np.array(points))
            print(area)
            area_updated = False
            if(area >= biggest_area):
                biggest_area = area
                area_updated = True
                biggest_line_words = []

            #print(f"   Line: '{line.text}', Bounding box {line.bounding_polygon}")
            line_list.append(line.text)
            
            for word in line.words:
                if(not is_number(word.text)):
                    if(area_updated):
                        biggest_line_words.append(word.text)
                    word_list.append(word.text)
                    #print(f"     Word: '{word.text}', Bounding polygon {word.bounding_polygon}, Confidence {word.confidence:.4f}")

        format = json.dumps(response.as_dict(), indent=1)

        
            
        search_with_every_word = " ".join(word_list)
        search_with_first_five_words = " ".join(word_list[:5])
        search_with_last_five_words = " ".join(word_list[-5:])
        search_with_biggest_line = " ".join(biggest_line_words)

        print(search_with_every_word)
        print(search_with_first_five_words)
        print(search_with_last_five_words)
        print(search_with_biggest_line)

    file_name = file_name.replace('.png','')
    poly_image_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name + "_poly_img.png")  
    cv2.imwrite(poly_image_path, img)



    using_ocr = True

    res = {"line_list": line_list,
            "ocr_result": format,
            "poly_image_path": poly_image_path}  

    elastic_result = {}

    if(using_ocr):

        elastic_result = get_elastic_results(search_with_every_word)

    id_list = ["123"] 
    matches_num_str = compare_results(id_list,elastic_result["ids"])


    res.update({"num_of_matches": matches_num_str})
    res.update(elastic_result)
    return jsonify(res)

def get_elastic_results(query_string):

        request_body = {
            "from": 0,               
            "size": 100,       
            "query": {
                "multi_match": {
                        "query": query_string,  
                  
                        "fields": ["name"], 
                        "type": "cross_fields"
            
                },
            }
        }
        

        response = elasticsearch_client.search(index=ELASTIC_INDEX, body=request_body)


        ids = [hit["_source"]["id"] for hit in response["hits"]["hits"] if "_source" in hit and "id" in hit["_source"]]
        prices = [hit["_source"]["price"] if "_source" in hit and "price" in hit["_source"] and hit["_source"]["price"] else "N/A" for hit in response["hits"]["hits"]]
        colors = [hit["_source"]["color"] for hit in response["hits"]["hits"] if "color" in hit and "color" in hit["_source"]]
       
        color_count = {}

        for color in colors:
            color = str(color).upper()
            if color in color_count:
                color_count[color] += 1
            else:
                color_count[color] = 1
    

        res = {
            "ids":ids,
            "prices":prices,
            "colors":colors,
            "colorCountDict":color_count
        }

        return res



def compare_results(results_1, results_2):
        # Convert lists to sets for faster membership checking
        results_1 = set(results_1)
        results_2 = set(results_2)
        
        # Find intersection of the two sets (common elements)
        common_elements = results_1.intersection(results_2)

        matches_num = str(len(common_elements))

        if(len(common_elements) > 0):
            return "There are " + matches_num + " ID matches"
        else:
            return "There are " + matches_num + " ID matches"
        

def is_number(s):
    print(s)
    try:
        # Check if it's a number
        float(s)
        return True
    except ValueError:
        return False
 

def add_backslash(string):
    string = string.replace(',', r'\,')
    string = string.replace('\'', r'\'')
    return string


# Define a function to initialize the Elasticsearch client
def initialize_elasticsearch_client(cloud_id, api_key):
    return Elasticsearch(
        cloud_id=cloud_id,
        api_key=api_key,
    )




elasticsearch_client = initialize_elasticsearch_client(ELASTIC_CLOUD_ID, ELASTIC_KEY)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
    
    


