import sys
import numpy as np
import cv2 as cv

if __name__== "__main__":
    if len(sys.argv) < 3:
        print('Please use command as python rgb2rgba.py ** **')
        sys.exit()
    alpha = 255  # 0, 120, 255
    image = cv.imread(sys.argv[1], cv.IMREAD_UNCHANGED)
    w, h, _ = image.shape
    alpha_channel = np.ones((w, h)) * 255
    img = np.zeros((w, h, 4))
    img[:,:,0] = image[:, :, 0]
    img[:,:,1] = image[:, :, 1]
    img[:,:,2] = image[:, :, 2]
    img[:,:,3] = alpha_channel
    cv.imwrite(sys.argv[2], img)
    