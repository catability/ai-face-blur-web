from threading import Thread


def start_process_job(app, job_id):
    thread=Thread(target=extract_and_detect_task, args=(app, job_id))
    thread.start()

def extract_and_detect_task(app, job_id):
    pass