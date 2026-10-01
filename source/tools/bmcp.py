import json, socket, sys, pathlib
def call(command, **params):
    with socket.create_connection(('127.0.0.1', 9876), timeout=8) as conn:
        conn.settimeout(900)
        conn.sendall(json.dumps({'type': command, 'params': params}).encode())
        data = b''
        while True:
            part = conn.recv(1 << 20)
            if not part: raise RuntimeError('closed')
            data += part
            try: return json.loads(data)
            except Exception: continue
if __name__ == '__main__':
    if sys.argv[1] == 'file':
        src = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')
        extra = sys.argv[3] if len(sys.argv) > 3 else ''
        r = call('execute_code', code=extra + '\n' + src)
    else:
        r = call('execute_code', code=sys.argv[1])
    print(json.dumps(r, ensure_ascii=False)[:4000])
