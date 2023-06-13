import sys
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Please use command as python char_ascii_uint.py ****")
        sys.exit()
    strChar = sys.argv[1]
    print('Input:', strChar)
    strLen = len(strChar)
    nStrFV = 0
    strFV = ''
    if strLen < 2:
        uc0 = ord(strChar[0])
        nStrFV = uc0
        strFV = strChar[0]
    elif strLen < 3:
        uc0 = ord(strChar[1])
        uc1 = ord(strChar[0])
        nStrFV = (uc0 << 8) | uc1
        strFV = strChar[0] + strChar[1]
    elif strLen < 4:
        uc0 = ord(strChar[2])
        uc1 = ord(strChar[1])
        uc2 = ord(strChar[0])
        nStrFV = (uc0 << 16) | (uc1 << 8) | uc2
        strFV = strChar[0] + strChar[1] + strChar[2]
    else:
        uc0 = ord(strChar[3])
        uc1 = ord(strChar[2])
        uc2 = ord(strChar[1])
        uc3 = ord(strChar[0])
        nStrFV = (uc0 << 24) | (uc1 << 16) | (uc2 << 8) | uc3
        strFV = strChar[0] + strChar[1] + strChar[2] + strChar[3]
    print('Convert ', strFV, " to ", nStrFV)
    