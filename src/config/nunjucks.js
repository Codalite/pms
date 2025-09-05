import nunjucks from 'nunjucks';
import dateFilter from 'nunjucks-date-filter';
export default (app, viewsPath) => {
  console.log('Configuring Nunjucks with views path:', viewsPath);
  const env = nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    watch: true,
    noCache: process.env.NODE_ENV !== 'production'
  });
  dateFilter.setDefaultFormat('MMM D, YYYY h:mm A');
  env.addFilter('date', dateFilter);
  // You can add more custom filters or globals here if needed
  app.set('view engine', 'html'); // since you're using .html now
};