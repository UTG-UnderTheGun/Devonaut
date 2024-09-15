# Contributing to Devonaut

We welcome contributions from everyone. To maintain a healthy and collaborative environment, please follow these guidelines.

## How to Contribute

### 1. Fork the Repository
- ใช้อินเทอร์เฟซของ GitHub เพื่อ fork repository ไปยังบัญชีของคุณ
- Clone repository ที่ fork แล้วไปยังเครื่องคอมพิวเตอร์ของคุณ:
  ```
  git clone https://github.com/your-username/project-name.git
  ```

### 2. Create a New Branch
- สร้าง branch ใหม่เสมอสำหรับการทำงานของคุณ:
  ```
  git checkout -b feature/your-feature-name
  ```
  
ใช้ชื่อที่สื่อความหมายสำหรับ branch ของคุณ (เช่น fix/bug-issue, feature/add-new-function)

3. Make Your Changes
- ปฏิบัติตามสไตล์การเขียนโค้ดและมาตรฐานของโครงการ
- ตรวจสอบให้แน่ใจว่าโค้ดของคุณทำงานได้และผ่านการทดสอบทั้งหมด (ถ้ามี)
- หากคุณเพิ่มโค้ดที่ควรทดสอบ ให้เพิ่มกรณีทดสอบที่เหมาะสม

4. Commit Your Changes
- ทำ commit ทีละน้อย ๆ และเป็นลำดับ
- เขียนข้อความ commit ที่มีความหมายและกระชับ:
  ```
  git commit -m "Short summary of changes"
  ```

5. Push to Your Fork
Push branch ของคุณไปยัง repository ที่ fork:
  ```
  git push origin feature/your-feature-name
  ```

6. Open a Pull Request
- ไปที่ repository ต้นฉบับและสร้าง pull request (PR) จาก branch ของคุณ
- ให้คำอธิบายที่ชัดเจนเกี่ยวกับการเปลี่ยนแปลงและเหตุผลที่จำเป็น
- ลิงก์กับปัญหาหรือการอภิปรายที่เกี่ยวข้อง (เช่น Fixes #123)
- เตรียมพร้อมที่จะตอบกลับความคิดเห็นจากผู้ตรวจสอบและทำการเปลี่ยนแปลงเพิ่มเติมหากจำเป็น

7. Keep Your Fork Updated
ซิงค์ fork ของคุณกับ repository ต้นฉบับอย่างสม่ำเสมอเพื่อให้อัปเดต:
  ```
  git remote add upstream https://github.com/AbilityJLR/Devonaut.git
  git fetch upstream
  git checkout main
  git merge upstream/main
  ```

Pull Request Guidelines
- ตรวจสอบให้แน่ใจว่าโค้ดของคุณมีการจัดรูปแบบที่ดีและเป็นไปตามมาตรฐานของโครงการ
- จัดทำเอกสารคุณลักษณะใหม่หรือการเปลี่ยนแปลงที่ทำให้โค้ดก่อนหน้าใช้งานไม่ได้
- เขียน unit tests สำหรับคุณลักษณะใหม่หรือการเปลี่ยนแปลงที่คุณทำ
- PR ควรมุ่งเน้นไปที่ปัญหาหรือฟีเจอร์เดียว
- อย่าใส่การเปลี่ยนแปลงที่ไม่เกี่ยวข้องใน PR เดียวกัน
- สื่อสารกับผู้ดูแลหาก PR ของคุณไม่ได้รับ feedback ในเวลาที่เหมาะสม

Issues and Discussions
- ก่อนที่จะส่งปัญหาใหม่ กรุณาค้นหาปัญหาที่มีอยู่แล้วเพื่อหลีกเลี่ยงการซ้ำซ้อน
- เมื่อเปิดปัญหา ให้ให้คำอธิบายที่ชัดเจนเกี่ยวกับปัญหา ขั้นตอนการทำซ้ำ และพฤติกรรมที่คาดหวัง
- สำหรับคำขอฟีเจอร์ โปรดอธิบายกรณีการใช้งานและประโยชน์ของฟีเจอร์นั้น
