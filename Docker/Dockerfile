# Sử dụng image Kali Linux
FROM kalilinux/kali-rolling

# Cập nhật hệ thống và cài đặt một số công cụ (ví dụ: nmap, ...)
RUN apt-get update && apt-get install -y \
    git \
    nmap \
    skipfish \
    nikto \
    wapiti \
    sqlmap \
    && apt-get clean

RUN cd /usr/share/nmap/scripts/ && git clone https://github.com/scipag/vulscan.git

# Mở Bash khi container khởi động
CMD ["/bin/bash"]
