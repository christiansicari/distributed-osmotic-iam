
import requests
from requests.structures import CaseInsensitiveDict
from sys import argv

def f(master, src, dest):


	url = f"http://admin:password@{master}:5984/_replicator"

	headers = CaseInsensitiveDict()
	headers["Connection"] = "keep-alive"	
	headers["accept"] = "application/json"
	headers["Pragma"] = "no-cache"
	headers["Content-Type"] = "application/json"

	data = '{"user_ctx":{"name":"admin","roles":["_admin","_reader","_writer"]},"source":{"url":"'+src+'","headers":{"Authorization":"Basic YWRtaW46cGFzc3dvcmQ="}},"target":{"url": "'+dest+'","headers":{"Authorization":"Basic YWRtaW46cGFzc3dvcmQ="}},"create_target":false,"continuous":true}'
	print(data)
	resp = requests.post(url, headers=headers, data=data)
	print(resp.status_code)

pi1 = argv[1]
pi2 = argv[2]

f(pi1, f"http://{pi1}:5984/permissions", f"http://{pi2}:5984/permissions")
f(pi1, f"http://{pi2}:5984/permissions", f"http://{pi1}:5984/permissions")
f(pi1, f"http://{pi1}:5984/users", f"http://{pi2}:5984/users")
f(pi1, f"http://{pi2}:5984/users", f"http://{pi1}:5984/users")