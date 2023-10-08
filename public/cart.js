$(function () {
  $(".addToCartButton").on("click", function () {
    console.log("add to cart button clicked");
    addToCart(this);
  });
});

function addToCart(buttonElement) {
  console.log("on add to cart function");
  const productId = $(buttonElement).data("product-id");
  const productName = $(buttonElement).data("product-name");
  const productPrice = $(buttonElement).data("product-price");
  const productImage = $(buttonElement).data("product-image");

  $.ajax({
    type: "POST",
    url: "/add-to-cart",
    contentType: "application/json",
    data: JSON.stringify({
      productId,
      name: productName,
      price: productPrice,
      image: productImage,
    }),
    success: function (data) {
      if (data.success) {
        alert("Product added to cart successfully!");
      } else {
        alert("Failed to add product to cart!");
      }
    },
  });
}
