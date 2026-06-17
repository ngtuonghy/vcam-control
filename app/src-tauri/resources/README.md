# Standalone Virtual Camera Driver Directory

Đặt tệp tin driver camera ảo của riêng bạn (`vcam.dll`) vào thư mục này:
`src-tauri/resources/vcam.dll`

### Cách thức hoạt động:
1. Khi ứng dụng khởi động hoặc khi người dùng kích hoạt, nhân Rust của ứng dụng Tauri sẽ đọc tệp `vcam.dll` từ thư mục tài nguyên này.
2. Ứng dụng sẽ tự động chạy tiến trình hệ thống để đăng ký thiết bị DirectShow filter này vào Windows:
   `regsvr32 /s vcam.dll`
3. Sau khi đăng ký thành công, thiết bị Camera ảo độc lập của bạn sẽ hiển thị trong tất cả các ứng dụng giao tiếp (Zoom, Teams, Meet...) dưới tên thiết bị do driver của bạn định nghĩa!

### Lưu ý:
* Đảm bảo tệp DLL được biên dịch tương thích với kiến trúc 64-bit của Windows (x64) để tương thích hoàn toàn với ứng dụng và hệ điều hành.
