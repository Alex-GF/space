echo "Removing ingress rules..."
kubectl delete -f ingress.yml
echo "Removing services..."
kubectl delete -f pods/
echo "Removing ingress controller..."
kubectl delete -f controllers/
echo "Creating namespace..."
kubectl delete -f space-namespace.yml