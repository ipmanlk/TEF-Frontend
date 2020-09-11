const getQuotationRequestPdf = (selectedEntry) => {
  let materialRows = "";
  selectedEntry.quotationRequestMaterials.forEach((rm, index) => {
    materialRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${rm.material.name}</td>
      </tr>
    `
  });
  return `
  <!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation Request</title>
  <!-- libs -->
  <link rel="stylesheet" href="../../lib/bootstrap/css/bootstrap.min.css" />
  <link rel="stylesheet" href="./quotation_request_pdf.css">
<style>
  
</style>

</head>
<body>
  <div class="container invoice">
    <div class="invoice-header">
      <div class="row">
        <div class="col-xs-7">
          <h1>Quotation Request<small> For Materials</small></h1>
          <h4 class="text-muted">NO: ${selectedEntry.qrnumber}| Date: ${selectedEntry.addedDate}</h4>
        </div>
        <div class="col-xs-5">
          <div class="media">
            <div class="media-left">
              <div style="height: 70px; width: 70px;"></div>
            </div>
            <ul class="media-body list-unstyled">
              <li><strong>Onelli Traders / Two Elephants Fireworks</strong></li>
              <li>Firework Manufacturers</li>
              <li>No 107/3, Walpala, Andiambalama.</li>
              <li>twoelephantsfireworks@yahoo.com</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="invoice-body">
      <div class="row">
        <div class="col-xs-5">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title">Company Details</h3>
            </div>
            <div class="panel-body">
              <dl class="dl-horizontal">
                <dt>Name</dt>
                <dd>Onelli Traders / Two Elephants Fireworks</dd>
                <dt>Address</dt>
                <dd>No 107/3, Walpala, Andiambalama.</dd>
                <dt>Phone</dt>
                <dd>076-373-8283</dd>
                <dt>Email</dt>
                <dd>twoelephantsfireworks@yahoo.com</dd>
            </div>
          </div>
        </div>
        <div class="col-xs-7">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title">Supplier Details</h3>
            </div>
            <div class="panel-body">
              <dl class="dl-horizontal">
                <dt>Name</dt>
                <dd>${selectedEntry.supplier.companyName}</dd>
                <dt>Address</dt>
                <dd>${selectedEntry.supplier.address}</dd>
                <dt>Phone</dt>
                <dd>${selectedEntry.supplier.companyMobile}</dd>
                <dt>Email</dt>
                <dd>${selectedEntry.supplier.email}</dd>
                <dt>&nbsp;</dt>
                <dd>&nbsp;</dd>
            </div>
          </div>
        </div>
      </div>
      <div class="panel panel-default">
        <div class="panel-heading">
          <h3 class="panel-title">Requesting Materials</h3>
        </div>
        <table class="table table-bordered table-condensed">
          <thead>
            <tr>
              <th>Index</th>
              <th>Material Name</th>
            </tr>
          </thead>
          <tbody>
              ${materialRows}
          </tbody>
        </table>
      </div>

      <div class="row">
        <div class="col-xs-12">
          <div class="panel panel-default">
            <div class="panel-heading">
              <i>Comments / Notes</i>
            </div>
            <div class="panel-body">
              ${selectedEntry.description.trim() == "" ? "None" : selectedEntry.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <!-- libs -->
  <script src="../../lib/bootstrap/js/bootstrap.min.js"></script>
</body>

</html>
  `
}