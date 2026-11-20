import classes from "./Preloader.module.scss";

const Preloader = () => {
  return (
    <div className={classes.ts_preloader}>
      <div className={classes.ts_spiner}></div>
    </div>
  );
};

export default Preloader;
