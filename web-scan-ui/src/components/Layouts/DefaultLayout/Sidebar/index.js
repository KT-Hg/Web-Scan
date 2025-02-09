import classNames from "classnames/bind";
import styles from "./Sidebar.module.scss";

const cx = classNames.bind(styles);

function Sidebar() {
  return (
    <header className={cx("wrapper")}>
      <div className={cx("inner")}>
        <p>hello</p>
      </div>
    </header>
  );
}

export default Sidebar;
