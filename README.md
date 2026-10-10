# 学生管理系统（本地网页练习版）

这是基于开源仓库 [nagavenkatavalli/student-management-system](https://github.com/nagavenkatavalli/student-management-system) 配置的本地练习项目。原作者为 Naga venkata Valli，原 README 声明采用 MIT License。网页和主要业务代码来自上游；本地配置、启动脚本和兼容性修复是本次调整的内容。

## 最简单的启动方式

在 VS Code 中打开 Student-Web 文件夹，打开终端，输入：

```powershell
.\start.ps1
```

随后输入你本机的 MySQL root 密码。脚本会启动 Java 后端和网页服务，并自动打开浏览器。

- 网页地址：http://127.0.0.1:5178
- 网页演示账号：demo_admin
- 网页演示密码：Demo12345!
- Java 后端地址：http://127.0.0.1:8088
- MySQL 练习库：student_web_demo_20261010

**网页演示账号与 MySQL root 账号是两套账号。** 网页登录用演示账号；启动终端里才输入 MySQL 密码。MySQL 密码由进程环境临时传递，不写进源码或配置文件。

保持启动终端打开，按 Ctrl+C 停止前后端。修改源码后，停止并重新运行脚本；脚本会按文件更新时间重新构建。当前网页使用构建后的版本，编辑源码不会立即自动更新页面。

## 先练习一条流程

1. 输入演示账号和密码，点击 Sign in（登录）。
2. 点击左侧 Students（学生）。
3. 点击 Add student（添加学生）。
4. 填写 Name（姓名）、Email（邮箱）和 Department（院系），点击 Create（创建）。
5. 刷新网页，检查记录是否还在；然后尝试编辑、删除和回收站恢复。

测试时保留了一条“网页练习学生”，供本机练习。它是演示数据。

## 网页与数据库怎么连起来

数据经过这条路径：

**浏览器 → Java 后端 → MySQL**

浏览器向 127.0.0.1:8088 发送 HTTP 请求；Java 后端使用 MySQL 驱动连接 127.0.0.1:3306，将数据保存到 student_web_demo_20261010。DataGrip 是另一个数据库客户端，也可以连接同一套 MySQL 查看数据。

这里使用本机服务，不依赖上网代理。数据库保存在本机 MySQL 的数据目录中；项目文件夹存放代码、依赖和运行文件。

## 从“添加学生”认识代码

建议按下面顺序打开文件，一次只看一个环节：

| 文件 | 负责什么 |
|---|---|
| studentms-frontend/src/pages/students/StudentFormModal.jsx | 显示表单，收集姓名、邮箱和院系 |
| studentms-frontend/src/lib/studentsApi.js | createStudent 函数向后端发送添加请求 |
| studentms-backend/src/main/java/com/sms/studentms_backend/controller/StudentController.java | createStudent 方法接收请求 |
| studentms-backend/src/main/java/com/sms/studentms_backend/service/StudentService.java | createStudent 方法整理并保存学生数据 |
| studentms-backend/src/main/java/com/sms/studentms_backend/repository/StudentRepository.java | 继承数据库访问接口，提供 save 等操作 |
| studentms-backend/src/main/java/com/sms/studentms_backend/entity/Student.java | 定义学生字段，以及对应的 students 表 |
| studentms-backend/src/main/resources/application-localdemo.properties | 配置 MySQL 地址、库名、用户名及密码来源 |

第一次先找到 StudentService.java 中的 studentRepository.save(student)：它就是把学生交给数据库访问层保存的地方。底层框架生成 SQL，再通过驱动发送给 MySQL。

## 文件夹结构

```text
Student-Web/
├── studentms-backend/     Java 后端
│   ├── src/main/          业务代码与配置
│   ├── src/test/          后端测试
│   ├── pom.xml            后端依赖和构建说明
│   └── target/            编译后的运行包
├── studentms-frontend/    React 网页
│   ├── src/               页面与请求代码
│   ├── package.json       网页依赖和命令
│   ├── node_modules/      网页依赖
│   └── dist/              构建后的网页
├── .tools/                本项目使用的 Maven 和依赖缓存
├── .runtime/              运行状态、日志和验证截图
└── start.ps1              本机启动脚本
```

Maven 帮 Java 项目获取依赖并编译打包；npm 帮网页项目获取依赖并执行构建命令。当前先通过启动脚本使用它们，理解业务代码后再单独学习这些工具。

## 已实测与当前边界

已通过：

- 后端现有 7 个测试。
- 浏览器登录、添加中文学生、刷新后仍能查询。
- 修改后重新读取、删除、回收站查询和恢复。
- CSV 导出包含新增记录。
- 不合法的学生信息返回 400，不存在的记录返回 404，未登录访问学生接口被拒绝。
- 390 像素宽页面没有整页横向溢出，测试流程没有浏览器运行错误。

上游的搜索框写着“姓名或邮箱”，当前后端实际只按姓名检索；单独按院系筛选的逻辑也尚不完整。这两项可以作为后续亲自修改并验证的练习。角色页面、图片上传和选课等额外模块仍需逐项验证，不把界面展示当成已经掌握或完整验证。

当前服务仅绑定 127.0.0.1，供本机浏览器学习和演示。

## 本次配置与回滚

本机使用现有 JDK、Node.js 和 MySQL。Maven 放在项目的 .tools 中，没有修改全局 PATH。后端采用独立练习库，配置为更新表结构，不在每次启动时重建数据库。

Git 标签 upstream-baseline 保留上游代码起点；后续提交记录本地修改。通过 git log 和 git diff upstream-baseline 查看调整内容。回退源码不会回退 MySQL 中的数据。
