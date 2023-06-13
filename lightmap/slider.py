import PySimpleGUI as sg

layout=[
[sg.Slider(range=(1,1000),orientation='h',size=(35,20), default_value=85, change_submits=True, key='slider')],
[sg.Cancel('cancel')],
[sg.Quit('exit',key='exit')],
]
window=sg.Window('常用控件',layout,font='微软雅黑')
while True:
    event,value=window.Read()
    print(event, value)
    if 'exit' == event:
        break
    elif 'slider' == event:
        deltaTime = value['slider'] / 100.0;
        print('Slider', deltaTime)
window.Close()